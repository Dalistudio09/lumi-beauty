import { pendingMigrations } from "../../scripts/migration-plan.mjs";

/** Which database backend is active. */
export type DbSource = "neon" | "pglite";

/**
 * Read env at call time. Do not use `process.env.DATABASE_URL` as a static
 * identifier — Vite can replace that with `undefined` at build time, which
 * made Vercel boot PGLite and look for `/var/task/_libs/pglite.data`.
 */
function readEnv(name: string): string {
  const env =
    typeof process === "undefined"
      ? undefined
      : (process.env as Record<string, string | undefined> | undefined);
  const value = env?.[name];
  return typeof value === "string" ? value.trim() : "";
}

function isServerless(): boolean {
  return Boolean(readEnv("VERCEL") || readEnv("VERCEL_ENV") || readEnv("AWS_LAMBDA_FUNCTION_NAME"));
}

export function getDatabaseUrl(): string {
  return readEnv("DATABASE_URL");
}

export function getDbSource(): DbSource {
  if (getDatabaseUrl()) return "neon";
  if (isServerless() || readEnv("NODE_ENV") === "production") return "neon";
  return "pglite";
}

/** @deprecated use getDbSource() — kept so existing imports keep compiling. */
export const dbSource: DbSource = "neon";

export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
}

const globalRef = globalThis as typeof globalThis & {
  __pgSqlPromise__?: Promise<Sql>;
  __pgliteInstance__?: Promise<import("@electric-sql/pglite").PGlite>;
  __pgliteMigrateChain__?: Promise<void>;
};

const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

async function applySqlFiles(
  exec: (sql: string) => Promise<void>,
  listApplied: () => Promise<string[]>,
  record: (name: string) => Promise<void>,
) {
  const migrations = import.meta.glob("/migrations/*.sql", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  const done = await listApplied();
  for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) {
    await exec(migrations[path]);
    await record(name);
  }
}

function createNeonSql(databaseUrl: string): Promise<Sql> {
  globalRef.__pgSqlPromise__ ??= (async () => {
    const { Pool, types } = await import("pg");
    types.setTypeParser(OID_INT8, Number);
    types.setTypeParser(OID_DATE, identity);
    types.setTypeParser(OID_INTERVAL, identity);
    const pool = new Pool({
      connectionString: databaseUrl,
      max: 4,
      ssl:
        databaseUrl.includes("sslmode=require") || databaseUrl.includes("neon.tech")
          ? { rejectUnauthorized: false }
          : undefined,
    });
    await pool.query(`
      create table if not exists _migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);
    const client = await pool.connect();
    try {
      await applySqlFiles(
        async (sql) => {
          await client.query("begin");
          try {
            await client.query(sql);
            await client.query("commit");
          } catch (err) {
            try {
              await client.query("rollback");
            } catch {
              // keep original error
            }
            throw err;
          }
        },
        async () => {
          const res = await client.query<{ name: string }>("select name from _migrations");
          return res.rows.map((row) => row.name);
        },
        async (name) => {
          await client.query("insert into _migrations (name) values ($1) on conflict do nothing", [
            name,
          ]);
        },
      );
    } finally {
      client.release();
    }
    return toSql(async <T>(text: string, params: unknown[]) => {
      const res = await pool.query(text, params);
      return res.rows as T[];
    });
  })().catch((err) => {
    globalRef.__pgSqlPromise__ = undefined;
    throw err;
  });
  return globalRef.__pgSqlPromise__;
}

async function createPgliteSql(): Promise<Sql> {
  if (isServerless() || readEnv("NODE_ENV") === "production") {
    throw new Error(
      "PGlite is disabled in production. Set DATABASE_URL to a Postgres connection string.",
    );
  }
  globalRef.__pgliteInstance__ ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite({
      parsers: {
        [OID_INT8]: Number,
        [OID_DATE]: identity,
        [OID_INTERVAL]: identity,
      },
    });
    await pg.waitReady;
    await pg.exec(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    return pg;
  })().catch((err) => {
    globalRef.__pgliteInstance__ = undefined;
    throw err;
  });
  const pg = await globalRef.__pgliteInstance__;

  const migrate = async (): Promise<void> => {
    await applySqlFiles(
      async (sql) => {
        await pg.exec(sql);
      },
      async () => {
        const doneRows = await pg.query<{ name: string }>("select name from _migrations");
        return doneRows.rows.map((row) => row.name);
      },
      async (name) => {
        await pg.query("insert into _migrations (name) values ($1)", [name]);
      },
    );
  };
  const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve())
    .catch(() => undefined)
    .then(migrate);
  globalRef.__pgliteMigrateChain__ = pass;
  await pass;

  return toSql(async <T>(text: string, params: unknown[]) => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  });
}

let sqlPromise: Promise<Sql> | null = null;

async function createSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getSql() from a createServerFn handler " +
        "or a server route loader, never from client code.",
    );
  }
  const databaseUrl = getDatabaseUrl();
  if (databaseUrl) return createNeonSql(databaseUrl);
  if (getDbSource() === "neon") {
    throw new Error(
      "DATABASE_URL is required on Vercel / production. PGlite is not used there.",
    );
  }
  return createPgliteSql();
}

export function getSql(): Promise<Sql> {
  sqlPromise ??= createSql().catch((err) => {
    sqlPromise = null;
    throw err;
  });
  return sqlPromise;
}

export async function getPglite(): Promise<import("@electric-sql/pglite").PGlite> {
  if (getDbSource() !== "pglite") {
    throw new Error("getPglite() is only available locally when DATABASE_URL is unset");
  }
  await getSql();
  const pg = await globalRef.__pgliteInstance__;
  if (!pg) throw new Error("PGLite instance failed to initialize");
  return pg;
}

export function ensureDbReady(): Promise<void> {
  if (getDatabaseUrl() || getDbSource() === "neon") return Promise.resolve();
  return getSql().then(() => undefined);
}
