import { Outlet } from "react-router";

export function AuthLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f6f7f8_0%,_#eef2f3_100%)] px-4 py-8 dark:bg-zinc-900 sm:px-6 lg:px-8">
      <Outlet />
    </main>
  );
}
