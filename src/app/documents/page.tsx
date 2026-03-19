import type { Metadata } from "next";
import { DocumentsScreen } from "@/widgets/documents-screen/ui/documents-screen";

export const metadata: Metadata = {
  title: "Документы | Эра Спорта",
  description: "Статические документы для ознакомления пользователей Эра Спорта",
};

export default function DocumentsPage() {
  return <DocumentsScreen mode="hub" />;
}
