export const dashboardPathByRole = {
  admin: "/admin/dashboard",
  trainer: "/trainer/dashboard",
  student: "/student",
};

export function getDashboardPath(role) {
  return dashboardPathByRole[role] ?? "/forbidden";
}
