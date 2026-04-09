import "@fontsource-variable/nunito-sans";
import type { Metadata } from "next";
import { AuthProvider } from "@/shared/auth/auth-context";
import { AppShell } from "@/shared/ui/app-shell/app-shell";
import { ToastProvider } from "@/shared/ui/toast-provider/toast-provider";
import "../shared/styles/globals.css";

export const metadata: Metadata = {
  title: "Эра Спорта",
  description: "Мобильное приложение фитнес-клуба",
  manifest: "/favicon/site.webmanifest",
  icons: {
    icon: [
      {
        url: "/favicon/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: "/favicon/apple-touch-icon.png",
    shortcut: "/favicon/favicon.ico",
  },
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
