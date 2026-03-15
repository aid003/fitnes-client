import type { Metadata } from "next";
import { MembershipsScreen } from "@/widgets/memberships-screen/ui/memberships-screen";

export const metadata: Metadata = {
  title: "Мои абонементы | Эра Спорта",
  description: "Управление активными и завершенными абонементами",
};

export default function MembershipsPage() {
  return <MembershipsScreen />;
}
