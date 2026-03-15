import type { Metadata } from "next";
import { RegisterVerifyScreen } from "@/widgets/register-verify-screen/ui/register-verify-screen";

export const metadata: Metadata = {
  title: "Подтверждение | Эра Спорта",
  description: "Подтверждение регистрации по коду",
};

export default function RegisterVerifyPage() {
  return <RegisterVerifyScreen />;
}
