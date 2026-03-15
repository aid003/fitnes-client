import type { Metadata } from "next";
import { PassesScreen } from "@/widgets/passes-screen/ui/passes-screen";

export const metadata: Metadata = {
  title: "Абонементы | Эра Спорта",
  description: "Покупка абонементов в приложении Эра Спорта",
};

export default function PassesPage() {
  return <PassesScreen />;
}
