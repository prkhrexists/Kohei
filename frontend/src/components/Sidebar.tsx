import { NavLink } from "react-router-dom";
import {
  BarChart2,
  FileText,
  Home,
  Settings,
  Upload,
  UserCircle
} from "lucide-react";

import { Logo } from "./shared/Logo";
import { Button } from "./ui/button";
import { StatusBadge } from "./shared/StatusBadge";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../lib/utils";

const navItems = [
  { label: "Dashboard", to: "/dashboard", icon: Home },
  { label: "Upload Data", to: "/upload", icon: Upload },
  { label: "Analyses", to: "/analysis/active", icon: BarChart2 },
  { label: "Reports", to: "/reports", icon: FileText },
  { label: "Settings", to: "/settings", icon: Settings }
];

export function Sidebar() {
  const { user, role, signOut } = useAuth();

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-[var(--border)] bg-[var(--card)] px-6 py-8 md:flex">
      <Logo />
      <nav className="mt-10 flex flex-1 flex-col gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
                isActive
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted)] hover:bg-[#e9eff5] hover:text-[var(--foreground)]"
              )
            }
          >
            <item.icon className="h-4 w-4" aria-hidden="true" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9eff5]">
            <UserCircle className="h-6 w-6 text-[var(--muted)]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold">{user?.displayName ?? "Signed In"}</p>
            <StatusBadge tone="neutral" label={role.toUpperCase()} />
          </div>
        </div>
        <Button
          variant="ghost"
          className="mt-4 w-full justify-center"
          onClick={signOut}
          aria-label="Sign out"
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
