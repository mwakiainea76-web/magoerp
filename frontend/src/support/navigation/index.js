import { adminNav } from "./admin.nav";
import { trainerNav } from "./trainer.nav";
import { studentNav } from "./student.nav";

export const sidebarNavigationByRole = {
  admin: adminNav,
  trainer: trainerNav,
  student: studentNav,
};

export function getSidebarLinks(role) {
  return sidebarNavigationByRole[role] ?? sidebarNavigationByRole.student;
}
