import Link from "next/link";
import {
  CalendarCheck2,
  CreditCard,
  House,
  IdCard,
} from "lucide-react";
import styles from "./bottom-nav.module.css";

type BottomNavItem = "home" | "passes" | "memberships" | "schedule";

type BottomNavProps = {
  activeItem: BottomNavItem;
};

const NAV_ITEMS: Array<{
  id: BottomNavItem;
  label: string;
  Icon: typeof House;
  href?: string;
}> = [
  { id: "home", label: "Главная", Icon: House, href: "/" },
  { id: "passes", label: "Абонементы", Icon: CreditCard, href: "/passes" },
  { id: "memberships", label: "Мои абонементы", Icon: IdCard, href: "/memberships" },
  { id: "schedule", label: "Расписание", Icon: CalendarCheck2 },
];

export function BottomNav({ activeItem }: BottomNavProps) {
  return (
    <nav className={styles.nav} aria-label="Основная навигация">
      {NAV_ITEMS.map(({ id, label, Icon, href }) => {
        const isActive = id === activeItem;
        const itemClassName = [styles.item, isActive ? styles.itemActive : ""]
          .filter(Boolean)
          .join(" ");
        const content = (
          <>
            <Icon className={styles.icon} strokeWidth={2.2} aria-hidden="true" />
            <span className={styles.label}>{label}</span>
          </>
        );

        if (!href) {
          return (
            <div
              key={id}
              className={[itemClassName, styles.itemStatic].filter(Boolean).join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              {content}
            </div>
          );
        }

        return (
          <Link
            key={id}
            href={href}
            className={itemClassName}
            aria-current={isActive ? "page" : undefined}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
