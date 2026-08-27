import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "soft";
  noScale?: boolean;
};

export function Button({
  className,
  variant = "primary",
  noScale,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center rounded-2xl px-5 text-sm font-medium tracking-wide",
        "transition-[transform,background-color,color,box-shadow,opacity] duration-150 ease-out",
        "disabled:cursor-not-allowed disabled:opacity-40",
        !noScale && "active:not-disabled:scale-[0.96]",
        variant === "primary" &&
          "bg-rose text-on-rose shadow-card hover:bg-rose-deep",
        variant === "secondary" &&
          "bg-surface text-ink shadow-card hover:bg-cream",
        variant === "ghost" && "bg-transparent text-ink hover:bg-surface-2",
        variant === "soft" && "bg-rose-soft text-rose-deep",
        className,
      )}
      {...props}
    />
  );
}
