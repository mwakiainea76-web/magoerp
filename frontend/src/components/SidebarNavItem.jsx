import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

const navTextClassName = "text-[13px] leading-5";

function itemOrChildrenActive(item, pathname) {
  if (item.to && pathname === item.to) {
    return true;
  }

  if (!item.children?.length) {
    return false;
  }

  return item.children.some((child) => child.to === pathname);
}

function SidebarChildLink({ child, onNavigate }) {
  const location = useLocation();
  const ChildIcon = child.icon;
  const isActive = child.to === location.pathname;

  return (
    <NavLink
      to={child.to}
      onClick={onNavigate}
      className={joinClasses(
        "flex min-h-7 items-center gap-2 px-4 pl-12 font-normal transition-colors duration-200",
        navTextClassName,
        isActive ? "text-emerald-400" : "text-[#7b879f] hover:text-[#cfd7e6]",
      )}
    >
      <span
        className={joinClasses(
          "h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-200",
          isActive ? "bg-emerald-500" : "bg-[#4a556f]",
        )}
      />
      {ChildIcon ? (
        <ChildIcon className="h-3.5 w-3.5 shrink-0 text-[#5e6b86]" />
      ) : null}
      <span className="truncate">{child.label}</span>
    </NavLink>
  );
}

export function SidebarNavItem({ item, onNavigate }) {
  const location = useLocation();
  const Icon = item.icon;
  const hasChildren = item.children?.length > 0;
  const isActive = useMemo(
    () => itemOrChildrenActive(item, location.pathname),
    [item, location.pathname],
  );
  const [isOpen, setIsOpen] = useState(Boolean(isActive || item.defaultOpen));

  useEffect(() => {
    if (isActive) {
      setIsOpen(true);
    }
  }, [isActive]);

  if (!hasChildren) {
    return (
      <div className="border-b border-white/6">
        <NavLink
          to={item.to}
          onClick={onNavigate}
          className={({ isActive: linkActive }) =>
            joinClasses(
              "flex min-h-12 w-full items-center gap-2.5 px-4 font-normal tracking-[0.005em] transition-colors duration-200",
              navTextClassName,
              linkActive
                ? "bg-emerald-500 text-[#f1f6f3]"
                : "text-[#b3bfd4] hover:bg-white/5 hover:text-[#dfe6f1]",
            )
          }
        >
          {Icon ? (
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
          ) : null}
          <span className="truncate">{item.label}</span>
        </NavLink>
      </div>
    );
  }

  return (
    <div className="border-b border-white/6">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={joinClasses(
          "flex min-h-12 w-full items-center justify-between gap-2.5 px-4 font-normal tracking-[0.005em] transition-colors duration-200",
          navTextClassName,
          isActive
            ? "bg-transparent text-[#b3bfd4]"
            : "bg-transparent text-[#aab5ca] hover:bg-white/5 hover:text-[#e3e8f2]",
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          {Icon ? (
            <Icon className="h-4 w-4 shrink-0" strokeWidth={1.9} />
          ) : null}
          <span className="truncate">{item.label}</span>
        </span>
        <ChevronLeft
          className={joinClasses(
            "h-[14px] w-[14px] shrink-0 transition-transform duration-300",
            isOpen ? "-rotate-90" : "rotate-0",
          )}
          strokeWidth={1.85}
        />
      </button>

      <div
        className={joinClasses(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          {item.children.map((child) => (
            <SidebarChildLink
              key={child.label}
              child={child}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
