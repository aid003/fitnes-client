import type { Metadata } from "next";
import { NewsScreen } from "@/widgets/news-screen/ui/news-screen";

export const metadata: Metadata = {
  title: "Новости | Эра Спорта",
  description: "Новости и обновления фитнес-клуба Эра Спорта",
};

export default function NewsPage() {
  return <NewsScreen />;
}
