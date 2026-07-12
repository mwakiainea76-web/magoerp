import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import Navbar from "@/components/Navbar";
import { Sidebar } from "@/components/Sidebar";
import { useAuthApi } from "@/hooks/useAuthApi";
import { getFinanceSidebarLinks, getSidebarLinks } from "@/support/navigation";
import { useAuthStore } from "@/store/authStore";

function ContentRouteLoader() {
  return (
    <div className="animate-pulse space-y-5" role="status" aria-live="polite">
      <span className="sr-only">Loading page...</span>
      <div className="h-24 rounded-xl border border-slate-200/70 bg-white" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-28 rounded-xl bg-slate-100" />
        <div className="h-28 rounded-xl bg-slate-100" />
        <div className="h-28 rounded-xl bg-slate-100" />
      </div>
      <div className="h-64 rounded-xl border border-slate-200/70 bg-white" />
    </div>
  );
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const { logout } = useAuthApi();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isNavbarOpen, setIsNavbarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const role = user?.role ?? "student";
  const isFinancePath = location.pathname.startsWith("/finance");
  const allLinks = role === "admin" && isFinancePath ? getFinanceSidebarLinks() : getSidebarLinks(role);
  const links = allLinks.filter((item) => role === "admin" || item.label !== "Back to Admin");

  useEffect(() => {
    setIsNavbarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    const syncSidebarState = (event) => {
      if (event.matches) {
        setIsSidebarOpen(true);
      }
    };

    syncSidebarState(desktopQuery);
    desktopQuery.addEventListener("change", syncSidebarState);

    return () => {
      desktopQuery.removeEventListener("change", syncSidebarState);
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
    } finally {
      clearAuth();
      setIsLoggingOut(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="flex min-h-screen text-slate-900">
      {isSidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 opacity-100 transition-opacity duration-300 ease-out lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        >
          <div
            className="h-full w-64 translate-x-0 transition-transform duration-300 ease-out will-change-transform"
            onClick={(event) => event.stopPropagation()}
          >
            <Sidebar
              role={role}
              links={links}
              onNavigate={() => setIsSidebarOpen(false)}
              className="h-full border-r border-white/6 shadow-2xl"
            />
          </div>
        </div>
      ) : null}

      <div
        className={[
          "hidden shrink-0 overflow-hidden border-r border-white/6 transition-[width,opacity] duration-300 ease-out lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start",
          isSidebarOpen ? "w-64 opacity-100" : "w-0 border-r-0 opacity-0",
        ].join(" ")}
      >
        {isSidebarOpen ? <Sidebar role={role} links={links} className="h-full" /> : null}
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar
          open={isNavbarOpen}
          setOpen={setIsNavbarOpen}
          user={user}
          logout={handleLogout}
          isLoggingOut={isLoggingOut}
          setMobileOpen={setIsSidebarOpen}
        />

        <main className="min-w-0 flex-1 px-5 py-5 sm:px-8">
          <section className="min-h-full" aria-label="Page content">
            <Suspense fallback={<ContentRouteLoader />}>
              <Outlet />
            </Suspense>
          </section>
        </main>
      </div>
    </div>
  );
}
