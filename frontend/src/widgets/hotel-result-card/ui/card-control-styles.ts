import { cn } from "@/shared/lib";

export type CardControlVariant = "default" | "secondary" | "outline";

const VARIANTS: Record<CardControlVariant, string> = {
  default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  outline:
    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
};

export function cardControlStyles({
  variant = "default",
  size,
  className,
}: {
  variant?: CardControlVariant | undefined;
  size?: "icon" | undefined;
  className?: string | undefined;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    VARIANTS[variant],
    size === "icon" ? "h-9 w-9" : "h-9 px-4 py-2",
    className,
  );
}
