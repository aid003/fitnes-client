import type { PropsWithChildren } from "react";
import styles from "./app-shell.module.css";

type AppShellProps = PropsWithChildren;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.viewport}>{children}</div>
    </div>
  );
}
