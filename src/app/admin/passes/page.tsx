import type { Metadata } from "next";
import { AdminPassesScreen } from "@/widgets/admin-passes-screen/ui/admin-passes-screen";

export const metadata: Metadata = {
  title: "Админка абонементов | Эра Спорта",
  description: "Управление каталогом абонементов",
};

export default function AdminPassesPage() {
  return <AdminPassesScreen />;
}
