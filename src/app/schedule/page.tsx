import type { Metadata } from "next";
import { ScheduleScreen } from "@/widgets/schedule-screen/ui/schedule-screen";

export const metadata: Metadata = {
  title: "Расписание | Эра Спорта",
  description: "Актуальное расписание занятий фитнес-клуба",
};

export default function SchedulePage() {
  return <ScheduleScreen />;
}
