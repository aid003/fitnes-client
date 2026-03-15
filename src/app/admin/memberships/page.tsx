import type { Metadata } from "next";
import { AdminMembershipsScreen } from "@/widgets/admin-memberships-screen/ui/admin-memberships-screen";

export const metadata: Metadata = {
  title: "Админка назначений | Эра Спорта",
  description: "Управление пользовательскими абонементами",
};

export default function AdminMembershipsPage() {
  return <AdminMembershipsScreen />;
}
