import { ReactNode } from "react";
import { cn } from "../../lib/utils";

type Breadcrumb = {
  label: string;
  href?: string;
};

type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
};

export function PageHeader({ title, description, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumbs" className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
          <ol className="flex flex-wrap gap-2">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-[var(--foreground)]">
                    {crumb.label}
                  </a>
                ) : (
                  <span>{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && <span className="text-[var(--border)]">/</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--foreground)]">{title}</h1>
          {description && <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>}
        </div>
        {actions && <div className={cn("flex items-center gap-3")}>{actions}</div>}
      </div>
    </div>
  );
}
