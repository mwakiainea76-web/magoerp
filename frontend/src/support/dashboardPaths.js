export const dashboardPathByRole = {
  admin: "/dashboard",
  trainer: "/dashboard",
  student: "/dashboard",
};

export function getDashboardPath(role) {
  return dashboardPathByRole[role] ?? "/forbidden";
}
