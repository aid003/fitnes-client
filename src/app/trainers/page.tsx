import type { Metadata } from "next";
import { TrainersScreen } from "@/widgets/trainers-screen/ui/trainers-screen";

export const metadata: Metadata = {
  title: "Тренерский состав | Эра Спорта",
  description: "Команда тренеров фитнес-клуба Эра Спорта",
};

export default function TrainersPage() {
  return <TrainersScreen />;
}
