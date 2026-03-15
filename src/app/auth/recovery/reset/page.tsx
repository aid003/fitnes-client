import type { Metadata } from "next";
import { RecoveryResetScreen } from "@/widgets/recovery-reset-screen/ui/recovery-reset-screen";

export const metadata: Metadata = {
  title: "Новый пароль | Эра Спорта",
  description: "Экран ввода нового пароля",
};

export default function RecoveryResetPage() {
  return <RecoveryResetScreen />;
}
