export default function Navbar({
  open,
  setOpen,
  user,
  logout,
  isLoggingOut,
  setMobileOpen,
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 w-full shrink-0 items-center border-b border-slate-200 bg-white px-6">
      <button
        onClick={() => setMobileOpen((current) => !current)}
        className="mr-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 active:scale-95"
        aria-label="Toggle sidebar"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div className="relative ml-auto flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 border-l border-slate-200 pl-4"
            aria-label="Open user menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white">
              {user?.last_name?.charAt(0) ?? user?.name?.charAt(0) ?? "U"}
            </div>
            <span className="hidden text-sm font-medium text-slate-700 sm:block">
              {user?.last_name ?? user?.name ?? "User"}
            </span>
          </button>

          {open && (
            <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {user?.last_name ?? user?.name ?? "User"} {user?.first_name ?? ""}
                </p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>

              <div className="p-1">
                <button
                  onClick={logout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M17 16l4-4m0 0l-4-4m4 4H7"
                    />
                  </svg>
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
