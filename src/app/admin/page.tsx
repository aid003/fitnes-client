import type { Metadata } from "next";
import { AdminHubScreen } from "@/widgets/admin-hub-screen/ui/admin-hub-screen";

export const metadata: Metadata = {
  title: "Админка | Эра Спорта",
  description: "Точка входа в административные разделы",
};

export default function AdminPage() {
  return <AdminHubScreen />;
}
