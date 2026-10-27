import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "md" | "sm";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white shadow-[0_4px_20px_rgba(255,70,85,0.35)] hover:bg-brand-dark hover:shadow-[0_8px_28px_rgba(255,70,85,0.5)]",
  outline:
    "border border-line-strong bg-white/[0.03] text-ink hover:border-brand/60 hover:bg-brand/10",
  ghost: "text-muted hover:bg-white/[0.06] hover:text-ink",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-11 px-6 text-sm",
  sm: "h-9 px-4 text-xs",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ className, variant = "primary", size = "md", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-heading font-semibold uppercase tracking-[0.14em] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
