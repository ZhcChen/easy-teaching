import type { ButtonHTMLAttributes, ReactNode } from "react";

type ControlButtonVariant = "primary" | "ghost";
type ControlButtonSize = "regular" | "compact";

type ControlButtonProps = {
  children: ReactNode;
  variant?: ControlButtonVariant;
  size?: ControlButtonSize;
  className?: string;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export function ControlButton({
  children,
  variant = "ghost",
  size = "regular",
  className,
  type = "button",
  ...props
}: ControlButtonProps) {
  const buttonClassName = [
    "control-button",
    `is-${variant}`,
    size === "compact" ? "is-compact" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={buttonClassName} {...props}>
      {children}
    </button>
  );
}
