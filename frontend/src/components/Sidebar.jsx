import { useEffect, useState } from "react";
import { SidebarNavItem } from "@/components/SidebarNavItem";
import { useLocation } from "react-router-dom";

export function Sidebar({ role, links, onNavigate, className = "" }) {
  const location = useLocation();
  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    const activeSection = links.find((item) =>
      item.children?.some((child) => child.to === location.pathname),
    );

    setOpenSection(activeSection?.label ?? null);
  }, [links, location.pathname]);

  return (
    <aside
      className={`flex h-full flex-col overflow-hidden bg-[#1b263b] text-zinc-900 ${className}`.trim()}
    >
      <div className="flex h-14 items-center px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 min-w-8 items-center justify-center rounded-[10px] bg-emerald-500 text-black">
            <svg
              className="h-4 w-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3z" />
            </svg>
          </div>
          <span className="overflow-hidden whitespace-nowrap text-[0.95rem] font-bold uppercase tracking-[-0.01em] text-white">
            Apex
          </span>
        </div>
      </div>

      <div className="border-t border-white/6" />

      <nav
        aria-label={`${role} navigation`}
        className="sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div>
          {links.map((item) => (
            <SidebarNavItem
              key={`${role}-${item.label}`}
              item={item}
              onNavigate={onNavigate}
              openSection={openSection}
              setOpenSection={setOpenSection}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-white/6" />
      <div className="p-3" />
    </aside>
  );
}
