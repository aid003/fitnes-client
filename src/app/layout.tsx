import "@fontsource-variable/nunito-sans";
import type { Metadata } from "next";
import { AppShell } from "@/shared/ui/app-shell/app-shell";
import "../shared/styles/globals.css";

export const metadata: Metadata = {
  title: "Эра Спорта",
  description: "Мобильное приложение фитнес-клуба",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
