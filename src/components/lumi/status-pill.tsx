import { statusLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-full px-3 text-xs font-medium",
        status === "new" && "bg-rose-soft text-rose-deep",
        status === "confirmed" && "bg-surface-2 text-success",
        status === "done" && "bg-surface-2 text-muted",
        status === "cancelled" && "bg-surface-2 text-danger",
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
