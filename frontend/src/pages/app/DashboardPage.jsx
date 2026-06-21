import { RoleDashboard } from "@/components/dashboard/RoleDashboard";
import { useAuthStore } from "@/store/authStore";

export function DashboardPage() {
  const role = useAuthStore((state) => state.user?.role);

  return <RoleDashboard role={role} />;
}
