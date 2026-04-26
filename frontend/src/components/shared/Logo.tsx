import { cn } from "../../lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl"
};

export function Logo({ size = "md", className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3 font-display", className)} aria-label="Kohei">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-lg font-bold text-[var(--primary-foreground)]">
        公平
      </div>
      <div className="leading-tight">
        <div className={cn("font-semibold tracking-tight", sizeMap[size])}>Kohei</div>
        <div className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Fair Lending AI</div>
      </div>
    </div>
  );
}
