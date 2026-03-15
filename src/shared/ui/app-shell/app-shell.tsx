"use client";

import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import styles from "./app-shell.module.css";

type AppShellProps = PropsWithChildren;

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  if (isAdminRoute) {
    return <div className={styles.viewportDesktop}>{children}</div>;
  }

  return (
    <div className={styles.shell}>
      <div className={styles.viewport}>{children}</div>
    </div>
  );
}
