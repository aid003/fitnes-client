import type { Metadata } from "next";
import { PassesCategoryScreen } from "@/widgets/passes-category-screen/ui/passes-category-screen";

export const metadata: Metadata = {
  title: "Детали абонемента | Эра Спорта",
  description: "Детальная страница абонемента в приложении Эра Спорта",
};

export default async function PassCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <PassesCategoryScreen slug={slug} />;
}
