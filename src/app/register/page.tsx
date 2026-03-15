import type { Metadata } from "next";
import { RegisterScreen } from "@/widgets/register-screen/ui/register-screen";

export const metadata: Metadata = {
  title: "Регистрация | Эра Спорта",
  description: "Создание аккаунта в приложении Эра Спорта",
};

export default function RegisterPage() {
  return <RegisterScreen />;
}
