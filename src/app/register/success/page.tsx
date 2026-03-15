import type { Metadata } from "next";
import { RegisterSuccessScreen } from "@/widgets/register-success-screen/ui/register-success-screen";

export const metadata: Metadata = {
  title: "Аккаунт создан | Эра Спорта",
  description: "Успешное завершение регистрации",
};

export default function RegisterSuccessPage() {
  return <RegisterSuccessScreen />;
}
