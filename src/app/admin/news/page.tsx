import type { Metadata } from "next";
import { AdminNewsScreen } from "@/widgets/admin-news-screen/ui/admin-news-screen";

export const metadata: Metadata = {
  title: "Админка новостей | Эра Спорта",
  description: "Управление новостями и публикациями",
};

export default function AdminNewsPage() {
  return <AdminNewsScreen />;
}
