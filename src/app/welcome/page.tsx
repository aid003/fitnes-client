import type { Metadata } from "next";
import { WelcomeScreen } from "@/widgets/welcome-screen/ui/welcome-screen";

export const metadata: Metadata = {
  title: "Добро пожаловать | Эра Спорта",
  description: "Стартовый экран мобильного приложения Эра Спорта",
};

export default function WelcomePage() {
  return <WelcomeScreen />;
}
