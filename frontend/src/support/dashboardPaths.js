export const dashboardPathByRole = {
  admin: "/dashboard",
  trainer: "/dashboard",
  student: "/",
};

export function getDashboardPath(role) {
  return dashboardPathByRole[role] ?? "/forbidden";
}
