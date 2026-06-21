import { SidebarNavItem } from "@/components/SidebarNavItem";

export function Sidebar({ role, links, onNavigate, className = "" }) {
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
        className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        <div>
          {links.map((item) => (
            <SidebarNavItem
              key={`${role}-${item.label}`}
              item={item}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      <div className="border-t border-white/6" />
      <div className="p-3" />
    </aside>
  );
}
