import { NavLink, useLocation } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

function isGroupActive(group, pathname) {
  if (group.match) return group.match(pathname);
  return pathname.startsWith(group.base);
}

function isActionActive(to, pathname) {
  if (pathname === to) return true;
  if (to.endsWith("/create")) return pathname === to;
  return pathname.startsWith(`${to}/`);
}

export function ModuleNav({ groups }) {
  const location = useLocation();
  const can = useAuthStore((state) => state.can);
  const activeGroup = groups
    .filter((group) => can(group.permission))
    .find((group) => isGroupActive(group, location.pathname));

  if (!activeGroup) return null;

  const visibleLinks = activeGroup.links.filter((link) => !link.permission || can(link.permission));

  return (
    <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm">
      {visibleLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={() => {
            const isActive = isActionActive(link.to, location.pathname);
            return `rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
              isActive ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`;
          }}
        >
          {link.label}
        </NavLink>
      ))}
    </div>
  );
}
