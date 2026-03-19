import type { Metadata } from "next";
import { AdminPaymentsScreen } from "@/widgets/admin-payments-screen/ui/admin-payments-screen";

export const metadata: Metadata = {
  title: "Админка платежей | Эра Спорта",
  description: "Аналитика пополнений, выручки и успешных транзакций",
};

export default function AdminPaymentsPage() {
  return <AdminPaymentsScreen />;
}
