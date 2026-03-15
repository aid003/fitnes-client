import type { Metadata } from "next";
import { RecoveryEmailScreen } from "@/widgets/recovery-email-screen/ui/recovery-email-screen";

export const metadata: Metadata = {
  title: "Восстановление пароля | Эра Спорта",
  description: "Экран ввода почты для восстановления пароля",
};

export default function RecoveryPage() {
  return <RecoveryEmailScreen />;
}
