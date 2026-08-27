import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

const controlClass =
  "h-12 w-full rounded-2xl bg-surface px-4 text-base text-ink shadow-card outline-none transition-[box-shadow] duration-150 placeholder:text-faint focus:shadow-[0_0_0_2px_var(--color-rose)]";

export function TextInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        controlClass,
        "h-28 resize-none py-3 leading-normal",
        className,
      )}
      {...props}
    />
  );
}
