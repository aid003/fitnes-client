import type { Metadata } from "next";
import { LoginScreen } from "@/widgets/login-screen/ui/login-screen";

export const metadata: Metadata = {
  title: "Вход | Эра Спорта",
  description: "Страница авторизации в приложении Эра Спорта",
};

export default function LoginPage() {
  return <LoginScreen />;
}
