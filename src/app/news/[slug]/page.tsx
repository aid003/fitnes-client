import type { Metadata } from "next";
import { NewsDetailsScreen } from "@/widgets/news-details-screen/ui/news-details-screen";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  return {
    title: `${slug} | Новости | Эра Спорта`,
    description: "Новость фитнес-клуба Эра Спорта",
  };
}

export default async function NewsDetailsPage({ params }: PageProps) {
  const { slug } = await params;
  return <NewsDetailsScreen slug={slug} />;
}
