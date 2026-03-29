"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarCheck2,
  ExternalLink,
  X,
  CreditCard,
  MapPinned,
  Newspaper,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/shared/auth/auth-guards";
import { apiFetch, ApiError, resolveApiAssetUrl } from "@/shared/lib/api";
import type { ActiveAdBanner, DismissAdResponse } from "@/shared/lib/contracts";
import { BottomNav } from "@/shared/ui/bottom-nav/bottom-nav";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./home-screen.module.css";

type HomeTile = {
  title: string;
  subtitle?: string;
  Icon: typeof CreditCard;
  className: string;
  href?: string;
};

export function HomeScreen() {
  const router = useRouter();
  const { canRender, isLoading, user } = useRequireAuth();
  const [activeAd, setActiveAd] = useState<ActiveAdBanner | null>(null);
  const [isAdLoading, setIsAdLoading] = useState(false);

  const homeTiles: HomeTile[] = [
    {
      title: "Тренера",
      Icon: UsersRound,
      className: [styles.tile, styles.tileToday].join(" "),
      href: "/trainers",
    },
    {
      title: "Новости",
      Icon: Newspaper,
      className: [styles.tile, styles.tileNews].join(" "),
      href: "/news",
    },
    {
      title: "Купить абонемент",
      Icon: CreditCard,
      className: [styles.tile, styles.tileBuy].join(" "),
      href: "/passes",
    },
    {
      title: "Мои абонементы",
      Icon: UserRound,
      className: [styles.tile, styles.tileMemberships].join(" "),
      href: "/memberships",
    },
    {
      title: "Расписание\nзанятий",
      Icon: CalendarCheck2,
      className: [styles.tile, styles.tileSchedule].join(" "),
      href: "/schedule",
    },
    {
      title: "Наши контакты",
      Icon: MapPinned,
      className: [styles.tile, styles.tileContacts].join(" "),
      href: "/contacts",
    },
  ];

  useEffect(() => {
    if (!canRender || !user) {
      return;
    }

    setIsAdLoading(true);

    void apiFetch<ActiveAdBanner | null>("/ads/active")
      .then((banner) => {
        setActiveAd(banner);
      })
      .catch((error) => {
        if (!(error instanceof ApiError && error.status === 404)) {
          setActiveAd(null);
        }
      })
      .finally(() => {
        setIsAdLoading(false);
      });
  }, [canRender, user]);

  const handleAdDismiss = async () => {
    if (!activeAd) {
      return;
    }

    try {
      await apiFetch<DismissAdResponse>(`/ads/${activeAd.id}/dismiss`, {
        method: "POST",
      });
    } catch {
      // Ignore dismiss transport errors to keep the close action responsive.
    } finally {
      setActiveAd(null);
    }
  };

  const handleAdNavigate = () => {
    if (!activeAd) {
      return;
    }

    if (/^https?:\/\//i.test(activeAd.targetUrl)) {
      window.location.href = activeAd.targetUrl;
      return;
    }

    router.push(activeAd.targetUrl);
  };

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем активную сессию." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем на вход." />;
  }

  return (
    <main className={styles.screen}>
      {activeAd?.imageUrl ? (
        <div className={styles.adOverlay} role="presentation">
          <div
            className={styles.adCard}
            role="button"
            tabIndex={0}
            aria-label={`Открыть рекламный баннер: ${activeAd.title}`}
            onClick={handleAdNavigate}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleAdNavigate();
              }
            }}
          >
            <Image
              src={resolveApiAssetUrl(activeAd.imageUrl) ?? ""}
              alt={activeAd.title}
              fill
              priority={!isAdLoading}
              className={styles.adImage}
              sizes="(max-width: 768px) 90vw, 420px"
              unoptimized
            />
            <div className={styles.adShade} />

            <button
              type="button"
              className={styles.adCloseButton}
              aria-label="Закрыть рекламный баннер"
              onClick={(event) => {
                event.stopPropagation();
                void handleAdDismiss();
              }}
            >
              <X size={26} strokeWidth={3} />
            </button>

            <div className={styles.adFooter}>
              <span className={styles.adHint}>Акция</span>
              <span className={styles.adAction}>
                Перейти
                <ExternalLink size={18} strokeWidth={2.4} />
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <section className={styles.panel}>
        <header className={styles.header}>
          <Image
            src="/asset/logo.png"
            alt="Эра Спорта"
            width={190}
            height={126}
            priority
            className={styles.logo}
          />

          <div className={styles.greeting}>
            <span className={styles.greetingLine}>Привет,</span>
            <span className={styles.greetingLine}>{user.name}</span>
          </div>
        </header>

        <section className={styles.tiles} aria-label="Главные разделы">
          {homeTiles.map(({ title, subtitle, Icon, className, href }) => {
            const content = (
              <>
                <div className={styles.tileCopy}>
                  <h2 className={styles.tileTitle}>
                    {title.split("\n").map((line) => (
                      <span key={line} className={styles.tileLine}>
                        {line}
                      </span>
                    ))}
                  </h2>
                  {subtitle ? <p className={styles.tileSubtitle}>{subtitle}</p> : null}
                </div>

                <Icon className={styles.tileIcon} strokeWidth={2.1} aria-hidden="true" />
              </>
            );

            if (href) {
              return (
                <Link key={title} href={href} className={[className, styles.tileLink].join(" ")}>
                  {content}
                </Link>
              );
            }

            return (
              <article key={title} className={className}>
                {content}
              </article>
            );
          })}
        </section>

        <BottomNav activeItem="home" />
      </section>
    </main>
  );
}
