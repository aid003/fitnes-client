import "@fontsource-variable/nunito-sans";
import type { Metadata } from "next";
import { AuthProvider } from "@/shared/auth/auth-context";
import { AppShell } from "@/shared/ui/app-shell/app-shell";
import { ToastProvider } from "@/shared/ui/toast-provider/toast-provider";
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
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
