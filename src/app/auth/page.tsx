import type { Metadata } from "next";
import { AuthChoiceScreen } from "@/widgets/auth-choice-screen/ui/auth-choice-screen";

export const metadata: Metadata = {
  title: "Авторизация | Эра Спорта",
  description: "Экран выбора авторизации или регистрации",
};

export default function AuthPage() {
  return <AuthChoiceScreen />;
}
