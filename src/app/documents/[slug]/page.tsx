import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { documents, getDocumentBySlug } from "@/shared/lib/documents";
import { DocumentsScreen } from "@/widgets/documents-screen/ui/documents-screen";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateStaticParams() {
  return documents.map((document) => ({
    slug: document.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const document = getDocumentBySlug(slug);

  if (!document) {
    return {
      title: "Документ не найден | Эра Спорта",
    };
  }

  return {
    title: document.metadataTitle,
    description: document.summary,
  };
}

export default async function DocumentPage({ params }: PageProps) {
  const { slug } = await params;
  const document = getDocumentBySlug(slug);

  if (!document) {
    notFound();
  }

  return <DocumentsScreen mode="document" document={document} />;
}
