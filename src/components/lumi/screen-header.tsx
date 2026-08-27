import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function ScreenHeader({
  title,
  onBack,
  action,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-center gap-3">
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink shadow-card transition-transform duration-150 ease-out active:scale-[0.96]"
          aria-label="Назад"
        >
          <ArrowLeft className="size-5" />
        </button>
      ) : null}
      <h1 className="min-w-0 flex-1 font-display text-2xl font-medium leading-snug tracking-tight">
        {title}
      </h1>
      {action}
    </header>
  );
}
