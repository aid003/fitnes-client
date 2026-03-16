import type { Metadata } from "next";
import { ContactsScreen } from "@/widgets/contacts-screen/ui/contacts-screen";

export const metadata: Metadata = {
  title: "Наши контакты | Эра Спорта",
  description: "Контакты фитнес-клуба Эра Спорта",
};

export default function ContactsPage() {
  return <ContactsScreen />;
}
