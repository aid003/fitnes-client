import type { Metadata } from "next";
import { AdminQrScannerScreen } from "@/widgets/admin-qr-scanner-screen/ui/admin-qr-scanner-screen";

export const metadata: Metadata = {
  title: "QR-сканер | Эра Спорта",
  description: "Сканирование QR-кодов абонементов в админке",
};

export default function AdminQrScannerPage() {
  return <AdminQrScannerScreen />;
}
