import type { Metadata } from "next";
import { AdminAdsScreen } from "@/widgets/admin-ads-screen/ui/admin-ads-screen";

export const metadata: Metadata = {
  title: "Админка рекламы | Эра Спорта",
  description: "Управление рекламными баннерами и попапами",
};

export default function AdminAdsPage() {
  return <AdminAdsScreen />;
}
