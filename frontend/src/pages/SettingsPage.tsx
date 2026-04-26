import { PageHeader } from "../components/shared/PageHeader";
import { Card, CardContent } from "../components/ui/card";

export function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage team access, compliance thresholds, and integrations."
        breadcrumbs={[{ label: "Kohei" }, { label: "Settings" }]}
      />
      <Card>
        <CardContent className="py-6 text-sm text-[var(--muted)]">
          Settings controls will be available in a future release.
        </CardContent>
      </Card>
    </div>
  );
}
