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
}> = [
  { id: "home", label: "Главная", Icon: House },
  { id: "passes", label: "Абонементы", Icon: CreditCard },
  { id: "memberships", label: "Мои абонементы", Icon: IdCard },
  { id: "schedule", label: "Расписание", Icon: CalendarCheck2 },
];

export function BottomNav({ activeItem }: BottomNavProps) {
  return (
    <nav className={styles.nav} aria-label="Основная навигация">
      {NAV_ITEMS.map(({ id, label, Icon }) => {
        const isActive = id === activeItem;

        return (
          <div
            key={id}
            className={[styles.item, isActive ? styles.itemActive : ""].filter(Boolean).join(" ")}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className={styles.icon} strokeWidth={2.2} aria-hidden="true" />
            <span className={styles.label}>{label}</span>
          </div>
        );
      })}
    </nav>
  );
}
