import { Bell, Search } from "lucide-react";

import { StatusBadge } from "./shared/StatusBadge";

export function TopBar() {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/95 px-6 py-4 backdrop-blur md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">Bank</p>
          <h2 className="text-lg font-semibold">Kohei Demo Bank</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[#221f1b] px-3 py-2 text-sm text-[var(--muted)] md:flex">
            <Search className="h-4 w-4" aria-hidden="true" />
            <span>Search (coming soon)</span>
          </div>
          <StatusBadge tone="warning" label="Analysis running" />
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[#221f1b] text-[var(--muted)]"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
