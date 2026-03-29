import type { Metadata } from "next";
import { AdminTrainersScreen } from "@/widgets/admin-trainers-screen/ui/admin-trainers-screen";

export const metadata: Metadata = {
  title: "Админка тренеров | Эра Спорта",
  description: "Управление карточками тренеров",
};

export default function AdminTrainersPage() {
  return <AdminTrainersScreen />;
}
