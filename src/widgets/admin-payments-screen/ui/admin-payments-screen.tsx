"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CreditCard, RefreshCcw, TrendingUp, Wallet } from "lucide-react";
import { useRequireAdmin } from "@/shared/auth/auth-guards";
import { useAuth } from "@/shared/auth/auth-context";
import { apiFetch, ApiError } from "@/shared/lib/api";
import type {
  AdminPaymentDetails,
  AdminPaymentLedgerItem,
  AdminPaymentsLedgerPage,
  AdminPaymentsOverview,
} from "@/shared/lib/contracts";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import styles from "./admin-payments-screen.module.css";

const DEFAULT_RANGE = "30d";
const DEFAULT_LEDGER_LIMIT = 20;

export function AdminPaymentsScreen() {
  const { canRender, isLoading, user } = useRequireAdmin();
  const { logout } = useAuth();
  const [range, setRange] = useState<"30d">(DEFAULT_RANGE);
  const [overview, setOverview] = useState<AdminPaymentsOverview | null>(null);
  const [ledger, setLedger] = useState<AdminPaymentLedgerItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<AdminPaymentDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isRefundLoading, setIsRefundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspace = async (selectedRange: "30d") => {
    const [overviewData, ledgerData] = await Promise.all([
      apiFetch<AdminPaymentsOverview>(`/admin/payments/overview?range=${selectedRange}`, {
        cache: "no-store",
      }),
      apiFetch<AdminPaymentsLedgerPage>(
        `/admin/payments/ledger?range=${selectedRange}&limit=${DEFAULT_LEDGER_LIMIT}`,
        {
          cache: "no-store",
        },
      ),
    ]);

    setOverview(overviewData);
    setLedger(ledgerData.items);
    setNextCursor(ledgerData.nextCursor);
    if (selectedPaymentId) {
      const details = await apiFetch<AdminPaymentDetails>(`/admin/payments/${selectedPaymentId}`, {
        cache: "no-store",
      });
      setSelectedPayment(details);
    }
  };

  useEffect(() => {
    if (!canRender) {
      return;
    }

    void loadWorkspace(range)
      .then(() => {
        setError(null);
      })
      .catch((loadError) => {
        setError(getErrorMessage(loadError, "Не удалось загрузить аналитику платежей"));
      })
      .finally(() => {
        setIsDataLoading(false);
      });
  }, [canRender, range]);

  const handleRefresh = async () => {
    try {
      setError(null);
      setIsDataLoading(true);
      await loadWorkspace(range);
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, "Не удалось обновить страницу"));
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextCursor) {
      return;
    }

    try {
      setIsLoadingMore(true);
      setError(null);

      const page = await apiFetch<AdminPaymentsLedgerPage>(
        `/admin/payments/ledger?range=${range}&limit=${DEFAULT_LEDGER_LIMIT}&cursor=${encodeURIComponent(nextCursor)}`,
        {
          cache: "no-store",
        },
      );

      setLedger((current) => [...current, ...page.items]);
      setNextCursor(page.nextCursor);
    } catch (loadMoreError) {
      setError(getErrorMessage(loadMoreError, "Не удалось догрузить транзакции"));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleSelectPayment = async (paymentId: string) => {
    try {
      setSelectedPaymentId(paymentId);
      setIsDetailsLoading(true);
      setError(null);
      const details = await apiFetch<AdminPaymentDetails>(`/admin/payments/${paymentId}`, {
        cache: "no-store",
      });
      setSelectedPayment(details);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Не удалось загрузить детали платежа"));
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!selectedPaymentId) {
      return;
    }

    try {
      setIsRefundLoading(true);
      setError(null);
      const details = await apiFetch<AdminPaymentDetails>(
        `/admin/payments/${selectedPaymentId}/refund`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );
      setSelectedPayment(details);
      await loadWorkspace(range);
    } catch (refundError) {
      setError(getErrorMessage(refundError, "Не удалось выполнить возврат"));
    } finally {
      setIsRefundLoading(false);
    }
  };

  const kpiCards = useMemo(() => {
    if (!overview) {
      return [];
    }

    return [
      {
        title: "Выручка",
        value: formatCurrency(overview.totals.grossRevenue),
        compare: formatComparison(
          overview.comparisons.grossRevenue.delta,
          overview.comparisons.grossRevenue.deltaPercent,
          true,
        ),
        hint: "К предыдущим 30 дням",
        Icon: Wallet,
      },
      {
        title: "Успешные оплаты",
        value: formatInteger(overview.totals.successfulPaymentsCount),
        compare: formatComparison(
          overview.comparisons.successfulPaymentsCount.delta,
          overview.comparisons.successfulPaymentsCount.deltaPercent,
          false,
        ),
        hint: "По проведённым платежам",
        Icon: CreditCard,
      },
      {
        title: "Средний чек",
        value: formatCurrency(overview.totals.averageCheck),
        compare: formatComparison(
          overview.comparisons.averageCheck.delta,
          overview.comparisons.averageCheck.deltaPercent,
          true,
        ),
        hint: "Среднее по успешным оплатам",
        Icon: TrendingUp,
      },
      {
        title: "Конверсия в оплату",
        value: `${formatPercent(overview.totals.paidConversionRate)}%`,
        compare: formatComparison(
          overview.comparisons.paidConversionRate.delta,
          overview.comparisons.paidConversionRate.deltaPercent,
          false,
        ),
        hint: `${formatInteger(overview.totals.createdOrdersCount)} создано заказов`,
        Icon: ArrowUpRight,
      },
    ];
  }, [overview]);

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем права доступа." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем из админки." />;
  }

  if (isDataLoading && !overview) {
    return <SessionStatus title="Загрузка" text="Собираем аналитику платежей." />;
  }

  if (!overview) {
    return (
      <SessionStatus
        title="Ошибка загрузки"
        text={error ?? "Не удалось загрузить страницу аналитики платежей."}
      />
    );
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>Платежи и пополнения</p>
            <h1 className={styles.title}>Финансовая аналитика</h1>
            <p className={styles.subtitle}>
              Выручка, динамика успешных продаж, популярные тарифы и ledger проведённых
              транзакций.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/admin" className={styles.secondaryButton}>
              Все админки
            </Link>
            <button type="button" className={styles.secondaryButton} onClick={() => void handleRefresh()}>
              <RefreshCcw size={16} />
              Обновить
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => void logout()}>
              Выйти
            </button>
          </div>
        </header>

        <div className={styles.toolbar}>
          <span className={styles.userBadge}>
            {user.name} · {user.email}
          </span>

          <label className={styles.rangeControl}>
            <span className={styles.rangeLabel}>Период</span>
            <select
              className={styles.rangeSelect}
              value={range}
              onChange={(event) => setRange(event.target.value as "30d")}
            >
              <option value="30d">Последние 30 дней</option>
            </select>
          </label>
        </div>

        {error ? <p className={styles.errorText}>{error}</p> : null}

        <section className={styles.kpiGrid} aria-label="Ключевые показатели">
          {kpiCards.map(({ title, value, compare, hint, Icon }) => (
            <article key={title} className={styles.kpiCard}>
              <div className={styles.kpiIcon}>
                <Icon size={20} />
              </div>
              <div className={styles.kpiCopy}>
                <p className={styles.kpiTitle}>{title}</p>
                <strong className={styles.kpiValue}>{value}</strong>
                <p className={styles.kpiCompare}>{compare}</p>
                <p className={styles.kpiHint}>{hint}</p>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.chartsGrid}>
          <article className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Дневная выручка</h2>
                <p className={styles.cardText}>{overview.rangeLabel}</p>
              </div>
            </div>
            <LineChart
              data={overview.revenueSeries}
              valueFormatter={(value) => formatCurrency(value)}
              lineColor="rgba(240, 184, 87, 0.95)"
              fillColor="rgba(240, 184, 87, 0.18)"
            />
          </article>

          <article className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Дневное число оплат</h2>
                <p className={styles.cardText}>Успешные платежи по дням</p>
              </div>
            </div>
            <BarChart
              data={overview.paymentsSeries}
              valueFormatter={(value) => formatInteger(value)}
              color="rgba(111, 225, 214, 0.92)"
            />
          </article>

          <article className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Неделя к неделе</h2>
                <p className={styles.cardText}>Текущая неделя против предыдущей</p>
              </div>
            </div>
            <WeekComparison
              current={overview.weeklyComparison.currentWeek}
              previous={overview.weeklyComparison.previousWeek}
            />
          </article>

          <article className={styles.chartCard}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Топ тарифов</h2>
                <p className={styles.cardText}>По выручке и количеству продаж</p>
              </div>
            </div>
            <div className={styles.rankedGrid}>
              <RankedBars
                title="По выручке"
                items={overview.topPlans.byRevenue}
                valueFormatter={(value) => formatCurrency(value)}
              />
              <RankedBars
                title="По количеству"
                items={overview.topPlans.byCount}
                valueFormatter={(value) => `${formatInteger(value)} шт.`}
              />
            </div>
          </article>
        </section>

        <section className={styles.ledgerSection}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Ledger успешных транзакций</h2>
              <p className={styles.cardText}>Только проведённые оплаты за выбранный период.</p>
            </div>
            <span className={styles.ledgerCount}>{ledger.length} строк</span>
          </div>

          {ledger.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyTitle}>За выбранный период нет успешных платежей.</p>
              <p className={styles.emptyText}>
                Как только появятся проведённые оплаты, здесь отобразится полный ledger.
              </p>
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Сумма</th>
                      <th>Тариф</th>
                      <th>Клиент</th>
                      <th>Заказ</th>
                      <th>Выдача</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((item) => (
                      <tr
                        key={item.paymentId}
                        onClick={() => void handleSelectPayment(item.paymentId)}
                        className={selectedPaymentId === item.paymentId ? styles.rowActive : undefined}
                      >
                        <td>
                          <div className={styles.primaryCell}>{formatDateTime(item.paidAt)}</div>
                          <div className={styles.secondaryCell}>
                            {item.status}
                            {item.gatewayStatus ? ` · ${item.gatewayStatus}` : ""}
                          </div>
                        </td>
                        <td>
                          <div className={styles.primaryCell}>{formatCurrency(item.amount)}</div>
                          <div className={styles.secondaryCell}>
                            {item.currency}
                            {item.refundedAmount > 0 ? ` · возврат ${formatCurrency(item.refundedAmount)}` : ""}
                          </div>
                        </td>
                        <td>
                          <div className={styles.primaryCell}>{item.plan.title}</div>
                          <div className={styles.secondaryCell}>
                            {[item.plan.categoryTitle, item.plan.variantTitle, item.plan.groupTitle]
                              .filter(Boolean)
                              .join(" / ")}
                          </div>
                        </td>
                        <td>
                          <div className={styles.primaryCell}>{item.user.name}</div>
                          <div className={styles.secondaryCell}>{item.user.email}</div>
                        </td>
                        <td>
                          <div className={styles.primaryCell}>{item.merchantOrderNumber}</div>
                          <div className={styles.secondaryCell}>
                            {item.gatewayPaymentId ?? item.paymentId}
                          </div>
                        </td>
                        <td>
                          <div className={styles.statusBadge}>
                            {item.membershipIssuedAt ? "Выдан абонемент" : "Ожидает выдачи"}
                          </div>
                          <div className={styles.secondaryCell}>
                            {item.membershipIssuedAt
                              ? formatDateTime(item.membershipIssuedAt)
                              : item.membershipId ?? "Без назначения"}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {nextCursor ? (
                <div className={styles.loadMoreWrap}>
                  <button
                    type="button"
                    className={styles.loadMoreButton}
                    onClick={() => void handleLoadMore()}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? "Загружаем ещё" : "Загрузить ещё"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>

        <section className={styles.chartCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Детали платежа</h2>
              <p className={styles.cardText}>
                Gateway-статусы, возврат и последние события по выбранной операции
              </p>
            </div>
          </div>

          {isDetailsLoading ? (
            <p className={styles.cardText}>Загружаем детали платежа…</p>
          ) : selectedPayment ? (
            <div className={styles.detailsStack}>
              <div className={styles.detailsGrid}>
                <div>
                  <div className={styles.primaryCell}>{selectedPayment.plan.title}</div>
                  <div className={styles.secondaryCell}>
                    {[selectedPayment.plan.categoryTitle, selectedPayment.plan.variantTitle, selectedPayment.plan.groupTitle]
                      .filter(Boolean)
                      .join(" / ")}
                  </div>
                </div>
                <div>
                  <div className={styles.primaryCell}>{selectedPayment.user.name}</div>
                  <div className={styles.secondaryCell}>{selectedPayment.user.email}</div>
                </div>
                <div>
                  <div className={styles.primaryCell}>{selectedPayment.gatewayProvider}</div>
                  <div className={styles.secondaryCell}>
                    {selectedPayment.gatewayStatus ?? "Статус не получен"}
                  </div>
                </div>
                <div>
                  <div className={styles.primaryCell}>
                    {selectedPayment.gatewayPaymentId ?? "Нет PaymentId"}
                  </div>
                  <div className={styles.secondaryCell}>
                    {selectedPayment.gatewayOrderId ?? "Legacy order id отсутствует"}
                  </div>
                </div>
              </div>

              <div className={styles.detailActions}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void handleSelectPayment(selectedPayment.paymentId)}
                >
                  Обновить детали
                </button>
                {selectedPayment.canRefund ? (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => void handleRefund()}
                    disabled={isRefundLoading}
                  >
                    {isRefundLoading ? "Возвращаем…" : "Полный возврат"}
                  </button>
                ) : null}
              </div>

              <div className={styles.detailsGrid}>
                <div>
                  <div className={styles.primaryCell}>{selectedPayment.statusLabel}</div>
                  <div className={styles.secondaryCell}>{selectedPayment.status}</div>
                </div>
                <div>
                  <div className={styles.primaryCell}>{formatCurrency(selectedPayment.amount)}</div>
                  <div className={styles.secondaryCell}>
                    Возвращено: {formatCurrency(selectedPayment.refundedAmount)}
                  </div>
                </div>
                <div>
                  <div className={styles.primaryCell}>
                    {selectedPayment.lastNotificationAt
                      ? formatDateTime(selectedPayment.lastNotificationAt)
                      : "Webhook ещё не приходил"}
                  </div>
                  <div className={styles.secondaryCell}>
                    Токен webhook:{" "}
                    {selectedPayment.notificationTokenValid === null
                      ? "не проверялся"
                      : selectedPayment.notificationTokenValid
                        ? "валидный"
                        : "невалидный"}
                  </div>
                </div>
                <div>
                  <div className={styles.primaryCell}>
                    {selectedPayment.actionCodeDescription ?? selectedPayment.gatewayMessage ?? "Без сообщения"}
                  </div>
                  <div className={styles.secondaryCell}>
                    {selectedPayment.gatewayErrorCode ?? selectedPayment.gatewayDetails ?? "Без кода ошибки"}
                  </div>
                </div>
              </div>

              <div className={styles.eventsList}>
                {selectedPayment.events.map((event) => (
                  <article key={event.id} className={styles.eventCard}>
                    <div className={styles.primaryCell}>
                      {event.type} · {formatDateTime(event.createdAt)}
                    </div>
                    <div className={styles.secondaryCell}>
                      {[event.gatewayStatus, event.errorCode, event.message].filter(Boolean).join(" · ") || "Без деталей"}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <p className={styles.cardText}>Выберите строку в ledger, чтобы открыть детали.</p>
          )}
        </section>
      </section>
    </main>
  );
}

function LineChart({
  data,
  valueFormatter,
  lineColor,
  fillColor,
}: {
  data: Array<{ date: string; value: number }>;
  valueFormatter: (value: number) => string;
  lineColor: string;
  fillColor: string;
}) {
  if (data.length === 0) {
    return null;
  }

  const width = 720;
  const height = 260;
  const padding = 18;
  const maxValue = Math.max(...data.map((item) => item.value), 1);
  const points = data.map((item, index) => {
    const x = padding + (index / Math.max(data.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (item.value / maxValue) * (height - padding * 2);
    return { ...item, x, y };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = [
    `${points[0]?.x},${height - padding}`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${points.at(-1)?.x},${height - padding}`,
  ].join(" ");

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartMeta}>
        <span>{valueFormatter(maxValue)}</span>
        <span>{valueFormatter(points.at(-1)?.value ?? 0)}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className={styles.chartSvg} role="img">
        <polygon points={area} fill={fillColor} />
        <polyline points={polyline} fill="none" stroke={lineColor} strokeWidth="4" />
        {points.map((point) => (
          <circle key={point.date} cx={point.x} cy={point.y} r="4.5" fill={lineColor} />
        ))}
      </svg>
      <div className={styles.axisLabels}>
        <span>{formatShortDate(data[0]?.date)}</span>
        <span>{formatShortDate(data.at(-1)?.date)}</span>
      </div>
    </div>
  );
}

function BarChart({
  data,
  valueFormatter,
  color,
}: {
  data: Array<{ date: string; value: number }>;
  valueFormatter: (value: number) => string;
  color: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className={styles.barChart}>
      <div className={styles.chartMeta}>
        <span>{valueFormatter(maxValue)}</span>
        <span>{formatInteger(data.reduce((sum, item) => sum + item.value, 0))} всего</span>
      </div>
      <div className={styles.barTrack}>
        {data.map((item) => (
          <div key={item.date} className={styles.barColumn}>
            <div
              className={styles.barValue}
              style={{
                height: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 8 : 0)}%`,
                background: color,
              }}
              title={`${formatShortDate(item.date)} · ${valueFormatter(item.value)}`}
            />
          </div>
        ))}
      </div>
      <div className={styles.axisLabels}>
        <span>{formatShortDate(data[0]?.date)}</span>
        <span>{formatShortDate(data.at(-1)?.date)}</span>
      </div>
    </div>
  );
}

function WeekComparison({
  current,
  previous,
}: {
  current: { grossRevenue: number; successfulPaymentsCount: number };
  previous: { grossRevenue: number; successfulPaymentsCount: number };
}) {
  const maxRevenue = Math.max(current.grossRevenue, previous.grossRevenue, 1);
  const maxCount = Math.max(current.successfulPaymentsCount, previous.successfulPaymentsCount, 1);

  return (
    <div className={styles.weekComparison}>
      <ComparisonRow
        label="Выручка"
        currentLabel={formatCurrency(current.grossRevenue)}
        previousLabel={formatCurrency(previous.grossRevenue)}
        currentValue={current.grossRevenue}
        previousValue={previous.grossRevenue}
        max={maxRevenue}
      />
      <ComparisonRow
        label="Оплаты"
        currentLabel={formatInteger(current.successfulPaymentsCount)}
        previousLabel={formatInteger(previous.successfulPaymentsCount)}
        currentValue={current.successfulPaymentsCount}
        previousValue={previous.successfulPaymentsCount}
        max={maxCount}
      />
    </div>
  );
}

function ComparisonRow({
  label,
  currentLabel,
  previousLabel,
  currentValue,
  previousValue,
  max,
}: {
  label: string;
  currentLabel: string;
  previousLabel: string;
  currentValue: number;
  previousValue: number;
  max: number;
}) {
  return (
    <div className={styles.comparisonRow}>
      <div className={styles.comparisonHead}>
        <span>{label}</span>
      </div>
      <div className={styles.comparisonGroup}>
        <div className={styles.comparisonLabel}>
          <span>Текущая</span>
          <strong>{currentLabel}</strong>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressCurrent}
            style={{ width: `${(currentValue / max) * 100}%` }}
          />
        </div>
      </div>
      <div className={styles.comparisonGroup}>
        <div className={styles.comparisonLabel}>
          <span>Предыдущая</span>
          <strong>{previousLabel}</strong>
        </div>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressPrevious}
            style={{ width: `${(previousValue / max) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function RankedBars({
  title,
  items,
  valueFormatter,
}: {
  title: string;
  items: Array<{
    planId: string;
    title: string;
    subtitle: string | null;
    categoryTitle: string | null;
    value: number;
  }>;
  valueFormatter: (value: number) => string;
}) {
  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className={styles.rankBlock}>
      <h3 className={styles.rankTitle}>{title}</h3>
      {items.length === 0 ? (
        <p className={styles.rankEmpty}>Нет данных за период.</p>
      ) : (
        <div className={styles.rankList}>
          {items.map((item) => (
            <div key={item.planId} className={styles.rankItem}>
              <div className={styles.rankHead}>
                <div>
                  <p className={styles.rankItemTitle}>{item.title}</p>
                  <p className={styles.rankItemMeta}>
                    {[item.categoryTitle, item.subtitle].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <strong className={styles.rankValue}>{valueFormatter(item.value)}</strong>
              </div>
              <div className={styles.rankTrack}>
                <div
                  className={styles.rankFill}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatInteger(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatComparison(delta: number, deltaPercent: number | null, asMoney: boolean) {
  const sign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const absolute = Math.abs(delta);
  const deltaLabel = asMoney ? formatCurrency(absolute) : formatPercent(absolute);
  const percentLabel =
    deltaPercent === null ? "новый период сравнения" : `${formatPercent(Math.abs(deltaPercent))}%`;

  return `${sign}${deltaLabel} · ${percentLabel}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value?: string) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
