import { adminNav } from "./admin.nav";
import { financeNav } from "./finance.nav";
import { trainerNav } from "./trainer.nav";
import { studentNav } from "./student.nav";

export const sidebarNavigationByRole = {
  admin: adminNav,
  finance: financeNav,
  trainer: trainerNav,
  student: studentNav,
};

export function getSidebarLinks(role) {
  return sidebarNavigationByRole[role] ?? sidebarNavigationByRole.student;
}

export function getFinanceSidebarLinks() {
  return financeNav;
}
