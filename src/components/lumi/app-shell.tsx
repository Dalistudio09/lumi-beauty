import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className="min-h-dvh bg-bg text-ink"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className={cn(
          "mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-6",
          className,
        )}
        style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top))" }}
      >
        {children}
      </div>
    </div>
  );
}
