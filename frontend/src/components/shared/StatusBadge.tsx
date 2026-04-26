import { Badge } from "../ui/badge";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

type StatusBadgeProps = {
  tone: StatusTone;
  label: string;
};

const toneToVariant = {
  success: "success",
  warning: "warning",
  danger: "danger",
  neutral: "secondary"
} as const;

export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <Badge variant={toneToVariant[tone]} aria-label={`Status: ${label}`}>
      {label}
    </Badge>
  );
}
