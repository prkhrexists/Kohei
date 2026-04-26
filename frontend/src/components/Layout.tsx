import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { LoadingSpinner } from "./shared/LoadingSpinner";

export function Layout() {
  const location = useLocation();
  const [routeLoading, setRouteLoading] = useState(false);

  useEffect(() => {
    setRouteLoading(true);
    const handle = window.setTimeout(() => setRouteLoading(false), 300);
    return () => window.clearTimeout(handle);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar />
          <main className="relative flex-1 px-6 pb-10 pt-6 md:px-10">
            {routeLoading ? (
              <div className="flex min-h-[60vh] items-center justify-center">
                <LoadingSpinner label="Loading view" />
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
