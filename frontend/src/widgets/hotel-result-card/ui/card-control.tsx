import type { ButtonHTMLAttributes } from "react";
import { cardControlStyles, type CardControlVariant } from "./card-control-styles";

export function CardControl({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: CardControlVariant | undefined;
  size?: "icon" | undefined;
}) {
  return (
    <button type={type} className={cardControlStyles({ variant, size, className })} {...props} />
  );
}
