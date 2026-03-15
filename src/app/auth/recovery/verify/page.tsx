import type { Metadata } from "next";
import { RecoveryVerifyScreen } from "@/widgets/recovery-verify-screen/ui/recovery-verify-screen";

export const metadata: Metadata = {
  title: "Код восстановления | Эра Спорта",
  description: "Экран ввода кода восстановления пароля",
};

export default function RecoveryVerifyPage() {
  return <RecoveryVerifyScreen />;
}
