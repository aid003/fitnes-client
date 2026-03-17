import { Suspense } from "react";
import type { Metadata } from "next";
import { PaymentsResultScreen } from "@/widgets/payments-result-screen/ui/payments-result-screen";

export const metadata: Metadata = {
  title: "Результат оплаты | Эра Спорта",
  description: "Результат оплаты абонемента",
};

export default function PaymentsResultPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsResultScreen />
    </Suspense>
  );
}
