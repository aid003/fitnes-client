import type { Metadata } from "next";
import { AdminScheduleScreen } from "@/widgets/admin-schedule-screen/ui/admin-schedule-screen";

export const metadata: Metadata = {
  title: "Админка расписания | Эра Спорта",
  description: "Управление недельной сеткой и исключениями расписания",
};

export default function AdminSchedulePage() {
  return <AdminScheduleScreen />;
}
