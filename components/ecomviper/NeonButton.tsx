import type { ButtonHTMLAttributes } from "react";

type NeonButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export default function NeonButton({ variant = "primary", className, disabled, ...props }: NeonButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-300/40";
  const primary =
    "border border-cyan-300/30 bg-cyan-300/15 text-white hover:bg-cyan-300/25";
  const secondary =
    "border border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.07]";
  const ghost =
    "border border-transparent bg-transparent text-white hover:bg-white/[0.06]";
  const disabledCls = "opacity-50 cursor-not-allowed";

  const variantCls = variant === "primary" ? primary : variant === "secondary" ? secondary : ghost;

  return (
    <button
      {...props}
      disabled={disabled}
      className={`${base} ${variantCls} ${disabled ? disabledCls : ""} ${className ?? ""}`}
    />
  );
}
