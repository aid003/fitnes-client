"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  Eye,
  Flame,
  Gift,
  Layers3,
  Plus,
  Snowflake,
  Ticket,
  Trash2,
  Upload,
  Waves,
} from "lucide-react";
import { useRequireAdmin } from "@/shared/auth/auth-guards";
import { useAuth } from "@/shared/auth/auth-context";
import { apiFetch, ApiError, resolveApiAssetUrl } from "@/shared/lib/api";
import type {
  PassBadge,
  PassCategoryDetails,
  PassFeature,
  PassFeatureIcon,
  PassPlan,
  PassPlanGroup,
  PassVariant,
  UploadImageResponse,
} from "@/shared/lib/contracts";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
import {
  BADGE_STYLE_OPTIONS,
  BILLING_TYPE_OPTIONS,
  createPlanDraft,
  DURATION_UNIT_OPTIONS,
  FEATURE_ICON_OPTIONS,
  findFeatureIconOption,
  formatBadgeStyle,
  formatBillingType,
  formatDurationUnit,
  formatFeatureIcon,
  formatHighlightStyle,
  formatPlanPrice,
  getPreviewBadges,
  HIGHLIGHT_STYLE_OPTIONS,
  type PlanDraft,
} from "./admin-passes-options";
import {
  useAdminActionFeedback,
  type AdminActionRunner,
} from "@/shared/lib/admin-action-feedback";
import { useToast } from "@/shared/ui/toast-provider/toast-provider";
import styles from "./admin-passes-screen.module.css";

type CategoryPayload = {
  title: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type VariantPayload = {
  title: string;
  slug: string;
  description?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type PlanPayload = {
  title: string;
  slug: string;
  description?: string;
  subtitle?: string;
  price: number;
  currency?: string;
  durationValue?: number;
  durationUnit?: string;
  visitCount?: number;
  billingType?: string;
  highlightStyle?: string;
  sortOrder?: number;
  isActive?: boolean;
};

type BadgePayload = {
  label: string;
  style?: string;
  sortOrder?: number;
};

type FeaturePayload = {
  label: string;
  icon: string;
  sortOrder?: number;
};

type SubmitResult = Promise<void | boolean>;

const MAX_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

type SelectedAdminNode =
  | { kind: "category"; id: string }
  | { kind: "variant"; id: string }
  | { kind: "group"; id: string }
  | { kind: "plan"; id: string }
  | { kind: "badge"; id: string }
  | { kind: "feature"; id: string }
  | null;

type CreateMode =
  | { kind: "category" }
  | { kind: "variant"; parentId: string }
  | { kind: "group"; parentId: string }
  | { kind: "plan"; parentId: string }
  | { kind: "badge"; parentId: string }
  | { kind: "feature"; parentId: string }
  | null;

type ChildCreateMode = Exclude<CreateMode, { kind: "category" } | null>;

type FoundNode =
  | {
      kind: "category";
      category: PassCategoryDetails;
    }
  | {
      kind: "variant";
      category: PassCategoryDetails;
      variant: PassVariant;
    }
  | {
      kind: "group";
      category: PassCategoryDetails;
      variant: PassVariant;
      group: PassPlanGroup;
    }
  | {
      kind: "plan";
      category: PassCategoryDetails;
      variant: PassVariant;
      group: PassPlanGroup;
      plan: PassPlan;
    }
  | {
      kind: "badge";
      category: PassCategoryDetails;
      variant: PassVariant;
      group: PassPlanGroup;
      plan: PassPlan;
      badge: PassBadge;
    }
  | {
      kind: "feature";
      category: PassCategoryDetails;
      variant: PassVariant;
      group: PassPlanGroup;
      plan: PassPlan;
      feature: PassFeature;
    };

const EMPTY_EXPANDED = {} as Record<string, boolean>;

export function AdminPassesScreen() {
  const { canRender, isLoading, user } = useRequireAdmin();
  const { logout } = useAuth();
  const [categories, setCategories] = useState<PassCategoryDetails[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedAdminNode>(null);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(EMPTY_EXPANDED);

  const loadCategories = async () => {
    const data = await apiFetch<PassCategoryDetails[]>("/admin/passes/categories");
    setCategories(data);
    setExpanded((current) => preserveExpandedState(data, current));
  };

  useEffect(() => {
    if (!canRender) {
      return;
    }

    void loadCategories()
      .then(() => {
        setError(null);
      })
      .catch((loadError) => {
        setError(getErrorMessage(loadError, "Не удалось загрузить данные админки"));
      })
      .finally(() => {
        setIsDataLoading(false);
      });
  }, [canRender]);

  const selected = findNode(categories, selectedNode);

  useEffect(() => {
    if (!selectedNode) {
      return;
    }

    if (!findNode(categories, selectedNode)) {
      setSelectedNode(null);
      setCreateMode(null);
    }
  }, [categories, selectedNode]);

  const runAction = useAdminActionFeedback({ setStatus, setError, getErrorMessage });

  const replaceCategory = (category: PassCategoryDetails) => {
    setCategories((current) =>
      current
        .map((item) => (item.id === category.id ? category : item))
        .sort((left, right) => left.sortOrder - right.sortOrder),
    );
    setExpanded((current) => ({
      ...current,
      ...buildExpandedState([category]),
    }));
  };

  const appendCategory = (category: PassCategoryDetails) => {
    setCategories((current) =>
      [...current, category].sort((left, right) => left.sortOrder - right.sortOrder),
    );
    setSelectedNode({ kind: "category", id: category.id });
    setCreateMode(null);
    setExpanded((current) => ({
      ...current,
      [`category:${category.id}`]: true,
    }));
  };

  const toggleExpanded = (key: string) => {
    setExpanded((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const handleDelete = async (selectedNodeToDelete: FoundNode) => {
    const path = getDeletePath(selectedNodeToDelete);
    const confirmText = getDeleteConfirmation(selectedNodeToDelete);

    if (!window.confirm(confirmText)) {
      return false;
    }

    return runAction(
      getDeletePendingMessage(selectedNodeToDelete),
      getDeleteSuccessMessage(selectedNodeToDelete),
      async () => {
        await apiFetch(path, { method: "DELETE" });
        await loadCategories();
      },
      getDeleteErrorMessage(selectedNodeToDelete),
    );
  };

  if (isLoading) {
    return <SessionStatus title="Загрузка" text="Проверяем права доступа." />;
  }

  if (!canRender || !user) {
    return <SessionStatus title="Переход" text="Перенаправляем из админки." />;
  }

  return (
    <main className={styles.screen}>
      <section className={styles.panel}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <h1 className={styles.title}>Админка абонементов</h1>
            <p className={styles.subtitle}>
              Слева структура каталога, справа компактный редактор выбранного элемента.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() => {
                setCreateMode({ kind: "category" });
                setSelectedNode(null);
              }}
            >
              <Plus size={16} />
              Категория
            </button>
            <Link href="/admin" className={styles.secondaryButton}>
              Все админки
            </Link>
            <Link href="/admin/memberships" className={styles.secondaryButton}>
              Назначения
            </Link>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void logout()}
            >
              Выйти
            </button>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.userBadge}>{user.email}</div>
          <div className={styles.feedback}>
            {status ? <p className={styles.statusText}>{status}</p> : null}
            {error ? <p className={styles.errorText}>{error}</p> : null}
          </div>
        </div>

        <div className={styles.workspace}>
          <aside className={styles.treePanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Структура каталога</h2>
                <p className={styles.panelText}>Категория → формат → группа → тариф.</p>
              </div>
              <span className={styles.summaryBadge}>{categories.length} категорий</span>
            </div>

            {isDataLoading ? (
              <p className={styles.panelText}>Загружаем каталог...</p>
            ) : (
              <div className={styles.tree}>
                {categories.map((category) => (
                  <TreeCategory
                    key={category.id}
                    category={category}
                    expanded={expanded}
                    selectedNode={selectedNode}
                    onSelect={setSelectedNode}
                    onToggle={toggleExpanded}
                    onCreate={(mode) => {
                      setCreateMode(mode);
                      setSelectedNode(null);
                    }}
                  />
                ))}
              </div>
            )}
          </aside>

          <section className={styles.editorPanel}>
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>Редактор</h2>
                <p className={styles.panelText}>
                  Только допустимые значения и минимум лишнего текста.
                </p>
              </div>
            </div>

            {createMode ? (
              <CreateEditor
                createMode={createMode}
                selected={selected}
                onCancel={() => setCreateMode(null)}
                onRunAction={runAction}
                onCreatedCategory={appendCategory}
                onUpdatedCategory={(category, nextNode) => {
                  replaceCategory(category);
                  setSelectedNode(nextNode);
                  setCreateMode(null);
                }}
              />
            ) : selected ? (
              <EntityEditor
                selected={selected}
                onRunAction={runAction}
                onReplaceCategory={replaceCategory}
                onCreate={(mode) => setCreateMode(mode)}
                onDelete={async () => {
                  const wasDeleted = await handleDelete(selected);
                  if (wasDeleted) {
                    setSelectedNode(null);
                    setCreateMode(null);
                  }
                }}
              />
            ) : (
              <div className={styles.placeholder}>
                <h3 className={styles.placeholderTitle}>Выберите элемент слева</h3>
                <p className={styles.panelText}>
                  Или создайте новую категорию. Для тарифа справа появится мини-превью карточки.
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function TreeCategory({
  category,
  expanded,
  selectedNode,
  onSelect,
  onToggle,
  onCreate,
}: {
  category: PassCategoryDetails;
  expanded: Record<string, boolean>;
  selectedNode: SelectedAdminNode;
  onSelect: (node: SelectedAdminNode) => void;
  onToggle: (key: string) => void;
  onCreate: (mode: CreateMode) => void;
}) {
  const nodeKey = `category:${category.id}`;
  const isExpanded = expanded[nodeKey];
  const isSelected = selectedNode?.kind === "category" && selectedNode.id === category.id;

  return (
    <div className={styles.treeBlock}>
      <TreeRow
        title={category.title}
        meta={category.slug}
        details={`${category.variants.length} форматов`}
        level={0}
        tone={category.isActive ? "active" : "muted"}
        selected={isSelected}
        canExpand={category.variants.length > 0}
        expanded={isExpanded}
        onToggle={() => onToggle(nodeKey)}
        onClick={() => onSelect({ kind: "category", id: category.id })}
        onCreate={() => onCreate({ kind: "variant", parentId: category.id })}
      />

      {isExpanded
        ? category.variants.map((variant) => (
            <TreeVariant
              key={variant.id}
              variant={variant}
              expanded={expanded}
              selectedNode={selectedNode}
              onSelect={onSelect}
              onToggle={onToggle}
              onCreate={onCreate}
            />
          ))
        : null}
    </div>
  );
}

function TreeVariant({
  variant,
  expanded,
  selectedNode,
  onSelect,
  onToggle,
  onCreate,
}: {
  variant: PassVariant;
  expanded: Record<string, boolean>;
  selectedNode: SelectedAdminNode;
  onSelect: (node: SelectedAdminNode) => void;
  onToggle: (key: string) => void;
  onCreate: (mode: CreateMode) => void;
}) {
  const nodeKey = `variant:${variant.id}`;
  const isExpanded = expanded[nodeKey];
  const isSelected = selectedNode?.kind === "variant" && selectedNode.id === variant.id;

  return (
    <div className={styles.treeBlock}>
      <TreeRow
        title={variant.title}
        meta={variant.slug}
        details={`${variant.groups.length} групп`}
        level={1}
        tone={variant.isActive ? "active" : "muted"}
        selected={isSelected}
        canExpand={variant.groups.length > 0}
        expanded={isExpanded}
        onToggle={() => onToggle(nodeKey)}
        onClick={() => onSelect({ kind: "variant", id: variant.id })}
        onCreate={() => onCreate({ kind: "group", parentId: variant.id })}
      />

      {isExpanded
        ? variant.groups.map((group) => (
            <TreeGroup
              key={group.id}
              group={group}
              expanded={expanded}
              selectedNode={selectedNode}
              onSelect={onSelect}
              onToggle={onToggle}
              onCreate={onCreate}
            />
          ))
        : null}
    </div>
  );
}

function TreeGroup({
  group,
  expanded,
  selectedNode,
  onSelect,
  onToggle,
  onCreate,
}: {
  group: PassPlanGroup;
  expanded: Record<string, boolean>;
  selectedNode: SelectedAdminNode;
  onSelect: (node: SelectedAdminNode) => void;
  onToggle: (key: string) => void;
  onCreate: (mode: CreateMode) => void;
}) {
  const nodeKey = `group:${group.id}`;
  const isExpanded = expanded[nodeKey];
  const isSelected = selectedNode?.kind === "group" && selectedNode.id === group.id;

  return (
    <div className={styles.treeBlock}>
      <TreeRow
        title={group.title}
        meta={group.slug}
        details={`${group.plans.length} тарифов`}
        level={2}
        tone={group.isActive ? "active" : "muted"}
        selected={isSelected}
        canExpand={group.plans.length > 0}
        expanded={isExpanded}
        onToggle={() => onToggle(nodeKey)}
        onClick={() => onSelect({ kind: "group", id: group.id })}
        onCreate={() => onCreate({ kind: "plan", parentId: group.id })}
      />

      {isExpanded
        ? group.plans.map((plan) => (
            <TreePlan
              key={plan.id}
              plan={plan}
              expanded={expanded}
              selectedNode={selectedNode}
              onSelect={onSelect}
              onToggle={onToggle}
              onCreate={onCreate}
            />
          ))
        : null}
    </div>
  );
}

function TreePlan({
  plan,
  expanded,
  selectedNode,
  onSelect,
  onToggle,
  onCreate,
}: {
  plan: PassPlan;
  expanded: Record<string, boolean>;
  selectedNode: SelectedAdminNode;
  onSelect: (node: SelectedAdminNode) => void;
  onToggle: (key: string) => void;
  onCreate: (mode: CreateMode) => void;
}) {
  const nodeKey = `plan:${plan.id}`;
  const isExpanded = expanded[nodeKey];
  const isSelected = selectedNode?.kind === "plan" && selectedNode.id === plan.id;

  return (
    <div className={styles.treeBlock}>
      <TreeRow
        title={plan.title}
        meta={plan.highlightStyle === "popular" ? "Популярный" : "Обычный"}
        details={formatPlanPrice(plan.price, plan.currency)}
        level={3}
        tone={plan.isActive ? "active" : "muted"}
        selected={isSelected}
        canExpand={plan.badges.length + plan.features.length > 0}
        expanded={isExpanded}
        onToggle={() => onToggle(nodeKey)}
        onClick={() => onSelect({ kind: "plan", id: plan.id })}
        onCreate={() => onCreate({ kind: "feature", parentId: plan.id })}
      />

      {isExpanded
        ? [
            ...plan.features.map((feature) => ({ type: "feature" as const, item: feature })),
            ...plan.badges.map((badge) => ({ type: "badge" as const, item: badge })),
          ]
            .sort((left, right) => left.item.sortOrder - right.item.sortOrder)
            .map((entry) =>
              entry.type === "feature" ? (
                <TreeRow
                  key={entry.item.id}
                  title={entry.item.label}
                  meta={formatFeatureIcon(entry.item.icon)}
                  details={`sort ${entry.item.sortOrder}`}
                  level={4}
                  tone="muted"
                  selected={selectedNode?.kind === "feature" && selectedNode.id === entry.item.id}
                  canExpand={false}
                  expanded={false}
                  onClick={() => onSelect({ kind: "feature", id: entry.item.id })}
                />
              ) : (
                <TreeRow
                  key={entry.item.id}
                  title={entry.item.label}
                  meta={formatBadgeStyle(entry.item.style)}
                  details={`sort ${entry.item.sortOrder}`}
                  level={4}
                  tone="muted"
                  selected={selectedNode?.kind === "badge" && selectedNode.id === entry.item.id}
                  canExpand={false}
                  expanded={false}
                  onClick={() => onSelect({ kind: "badge", id: entry.item.id })}
                />
              ),
          )
        : null}
    </div>
  );
}

function TreeRow({
  title,
  meta,
  details,
  level,
  tone,
  selected,
  canExpand,
  expanded,
  onToggle,
  onClick,
  onCreate,
}: {
  title: string;
  meta: string;
  details: string;
  level: number;
  tone: "active" | "muted";
  selected: boolean;
  canExpand: boolean;
  expanded: boolean;
  onToggle?: () => void;
  onClick: () => void;
  onCreate?: () => void;
}) {
  return (
    <div
      className={[styles.treeRow, selected ? styles.treeRowSelected : ""].filter(Boolean).join(" ")}
      style={{ paddingLeft: `${12 + level * 16}px` }}
    >
      <span className={styles.treeExpand}>
        {canExpand ? (
          <button
            type="button"
            className={styles.iconButton}
            onClick={onToggle}
            aria-label={expanded ? "Свернуть раздел" : "Развернуть раздел"}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        ) : (
          <span className={styles.dotMarker} />
        )}
      </span>

      <button type="button" className={styles.treeMain} onClick={onClick}>
        <span className={styles.treeText}>
          <span className={styles.treeTitle}>{title}</span>
          <span className={styles.treeMeta}>{meta}</span>
        </span>
        <span className={styles.treeInfo}>
          <span
            className={[
              styles.treeState,
              tone === "active" ? styles.treeStateActive : styles.treeStateMuted,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {tone === "active" ? "Активно" : "Скрыто"}
          </span>
          <span className={styles.treeDetails}>{details}</span>
        </span>
      </button>

      {onCreate ? (
        <button
          type="button"
          className={styles.iconButton}
          onClick={onCreate}
          title="Создать дочерний элемент"
        >
          <Plus size={16} />
        </button>
      ) : null}
    </div>
  );
}

function CreateEditor({
  createMode,
  selected,
  onCancel,
  onRunAction,
  onCreatedCategory,
  onUpdatedCategory,
}: {
  createMode: NonNullable<CreateMode>;
  selected: FoundNode | null;
  onCancel: () => void;
  onRunAction: AdminActionRunner;
  onCreatedCategory: (category: PassCategoryDetails) => void;
  onUpdatedCategory: (
    category: PassCategoryDetails,
    nextNode: NonNullable<SelectedAdminNode>,
  ) => void;
}) {
  if (createMode.kind === "category") {
    return (
      <EditorCard
        title="Новая категория"
        subtitle="Верхний уровень каталога"
        path="Создание"
      >
        <CategoryCreateForm
          submitLabel="Создать категорию"
          onSubmit={(payload) =>
            onRunAction(
              "Создаем категорию...",
              "Категория создана",
              async () => {
                const category = await apiFetch<PassCategoryDetails>("/admin/passes/categories", {
                  method: "POST",
                  body: JSON.stringify(payload),
                });
                onCreatedCategory(category);
              },
              "Не удалось создать категорию",
            )
          }
          onCancel={onCancel}
        />
      </EditorCard>
    );
  }

  return (
    <EditorCard
      title={getCreateTitle(createMode.kind)}
      subtitle="Новый дочерний элемент"
      path={selected ? getSelectedPath(selected) : "Создание"}
    >
      <CreateChildForm
        createMode={createMode}
        onCancel={onCancel}
        onSubmit={(payload) =>
          onRunAction(
            "Создаем элемент...",
            getCreateSuccessMessage(createMode.kind),
            async () => {
              const response = await createChild(createMode, payload);
              const nextNode = findCreatedNode(response, createMode, payload);

              if (nextNode) {
                onUpdatedCategory(response, nextNode);
              } else {
                onUpdatedCategory(response, { kind: "category", id: response.id });
              }
            },
            getCreateErrorMessage(createMode.kind),
          )
        }
      />
    </EditorCard>
  );
}

function EntityEditor({
  selected,
  onRunAction,
  onReplaceCategory,
  onCreate,
  onDelete,
}: {
  selected: FoundNode;
  onRunAction: AdminActionRunner;
  onReplaceCategory: (category: PassCategoryDetails) => void;
  onCreate: (mode: ChildCreateMode) => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <EditorCard
      title={getSelectedTitle(selected)}
      subtitle={getSelectedMeta(selected)}
      path={getSelectedPath(selected)}
      actions={
        <>
          <div className={styles.editorActions}>
            {getCreateActions(selected).map((action) => (
              <button
                key={`${action.kind}:${action.parentId}`}
                type="button"
                className={styles.secondaryButton}
                onClick={() => onCreate(action)}
              >
                <Plus size={16} />
                {getCreateActionLabel(action.kind)}
              </button>
            ))}
          </div>
          <div className={styles.editorDangerZone}>
            <button type="button" className={styles.dangerButton} onClick={() => void onDelete()}>
              <Trash2 size={16} />
              Удалить
            </button>
          </div>
        </>
      }
    >
      {selected.kind === "category" ? (
        <CategoryEditForm
          category={selected.category}
          onRunAction={onRunAction}
          onReplaceCategory={onReplaceCategory}
          onSubmit={(payload) =>
            onRunAction(
              "Сохраняем категорию...",
              "Категория сохранена",
              async () => {
                const category = await apiFetch<PassCategoryDetails>(
                  `/admin/passes/categories/${selected.category.id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                  },
                );
                onReplaceCategory(category);
              },
              "Не удалось сохранить категорию",
            )
          }
        />
      ) : null}

      {selected.kind === "variant" ? (
        <VariantEditForm
          entity={selected.variant}
          submitLabel="Сохранить подпункт"
          onSubmit={(payload) =>
            onRunAction(
              "Сохраняем подпункт...",
              "Подпункт сохранён",
              async () => {
                const category = await apiFetch<PassCategoryDetails>(
                  `/admin/passes/variants/${selected.variant.id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                  },
                );
                onReplaceCategory(category);
              },
              "Не удалось сохранить подпункт",
            )
          }
        />
      ) : null}

      {selected.kind === "group" ? (
        <VariantEditForm
          entity={selected.group}
          submitLabel="Сохранить группу"
          onSubmit={(payload) =>
            onRunAction(
              "Сохраняем группу...",
              "Группа сохранена",
              async () => {
                const category = await apiFetch<PassCategoryDetails>(
                  `/admin/passes/groups/${selected.group.id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                  },
                );
                onReplaceCategory(category);
              },
              "Не удалось сохранить группу",
            )
          }
        />
      ) : null}

      {selected.kind === "plan" ? (
        <PlanForm
          plan={selected.plan}
          submitLabel="Сохранить тариф"
          onSubmit={(payload) =>
            onRunAction(
              "Сохраняем тариф...",
              "Тариф сохранён",
              async () => {
                const category = await apiFetch<PassCategoryDetails>(
                  `/admin/passes/plans/${selected.plan.id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                  },
                );
                onReplaceCategory(category);
              },
              "Не удалось сохранить тариф",
            )
          }
        />
      ) : null}

      {selected.kind === "badge" ? (
        <BadgeForm
          badge={selected.badge}
          submitLabel="Сохранить бейдж"
          onSubmit={(payload) =>
            onRunAction(
              "Сохраняем бейдж...",
              "Бейдж сохранён",
              async () => {
                const category = await apiFetch<PassCategoryDetails>(
                  `/admin/passes/badges/${selected.badge.id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                  },
                );
                onReplaceCategory(category);
              },
              "Не удалось сохранить бейдж",
            )
          }
        />
      ) : null}

      {selected.kind === "feature" ? (
        <FeatureForm
          feature={selected.feature}
          submitLabel="Сохранить преимущество"
          onSubmit={(payload) =>
            onRunAction(
              "Сохраняем преимущество...",
              "Преимущество сохранено",
              async () => {
                const category = await apiFetch<PassCategoryDetails>(
                  `/admin/passes/features/${selected.feature.id}`,
                  {
                    method: "PATCH",
                    body: JSON.stringify(payload),
                  },
                );
                onReplaceCategory(category);
              },
              "Не удалось сохранить преимущество",
            )
          }
        />
      ) : null}
    </EditorCard>
  );
}

function EditorCard({
  title,
  subtitle,
  path,
  actions,
  children,
}: {
  title: string;
  subtitle: string;
  path: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.editorCard}>
      <div className={styles.editorHeader}>
        <div className={styles.editorHeaderTop}>
          <div>
            <h3 className={styles.editorTitle}>{title}</h3>
            <p className={styles.panelText}>{subtitle}</p>
          </div>
          <div className={styles.pathChip}>{path}</div>
        </div>
        {actions ? <div className={styles.editorHeaderActions}>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

function CategoryCreateForm({
  submitLabel,
  onSubmit,
  onCancel,
}: {
  submitLabel: string;
  onSubmit: (payload: CategoryPayload) => SubmitResult;
  onCancel: () => void;
}) {
  return (
    <form className={styles.editorForm} onSubmit={(event) => handleCategorySubmit(event, onSubmit)}>
      <BasicCategoryFields />
      <EditorButtons submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}

function CategoryEditForm({
  category,
  onSubmit,
  onRunAction,
  onReplaceCategory,
}: {
  category: PassCategoryDetails;
  onSubmit: (payload: CategoryPayload) => SubmitResult;
  onRunAction: AdminActionRunner;
  onReplaceCategory: (category: PassCategoryDetails) => void;
}) {
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();
  const selectedCoverImageUrl = useMemo(
    () => resolveApiAssetUrl(category.coverImageUrl),
    [category.coverImageUrl],
  );

  useEffect(() => {
    setPendingUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [category.id, category.coverImageUrl]);

  return (
    <form className={styles.editorForm} onSubmit={(event) => handleCategorySubmit(event, onSubmit)}>
      <BasicCategoryFields category={category} />
      <section className={styles.mediaPanel}>
        <div className={styles.mediaPreview}>
          {selectedCoverImageUrl ? (
            <Image
              src={selectedCoverImageUrl}
              alt={category.title}
              fill
              sizes="220px"
              className={styles.mediaImage}
              unoptimized
            />
          ) : (
            <div className={styles.mediaPlaceholder}>Фото</div>
          )}
        </div>

        <div className={styles.mediaActions}>
          <input
            ref={fileInputRef}
            className={styles.hiddenFileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              const nextFile = event.target.files?.[0] ?? null;

              if (nextFile && nextFile.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
                setPendingUpload(null);
                event.target.value = "";
                toast.error("Размер изображения должен быть не больше 5 МБ");
                return;
              }

              setPendingUpload(nextFile);
            }}
          />

          <div className={styles.mediaText}>
            <h4 className={styles.mediaTitle}>Обложка категории</h4>
            <p className={styles.panelText}>
              Используется на карточке категории в каталоге абонементов.
            </p>
          </div>

          <div className={styles.filePickerRow}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => fileInputRef.current?.click()}
            >
              Выбрать изображение
            </button>
            <span className={pendingUpload ? styles.fileName : styles.fileHint}>
              {pendingUpload ? pendingUpload.name : "PNG, JPG или WEBP до 5 МБ"}
            </span>
          </div>

          <div className={styles.mediaButtons}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={!pendingUpload}
              onClick={() => {
                if (!pendingUpload) {
                  return;
                }

                void onRunAction(
                  "Загружаем обложку категории...",
                  "Обложка загружена",
                  async () => {
                    if (pendingUpload.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
                      throw new Error("Размер изображения должен быть не больше 5 МБ");
                    }

                    const formData = new FormData();
                    formData.append("file", pendingUpload);
                    const response = await apiFetch<UploadImageResponse<PassCategoryDetails>>(
                      `/admin/passes/categories/${category.id}/cover`,
                      {
                        method: "POST",
                        body: formData,
                      },
                    );
                    onReplaceCategory(response.item);
                    setPendingUpload(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  },
                  "Не удалось загрузить обложку категории",
                );
              }}
            >
              <Upload size={16} />
              Загрузить обложку
            </button>
          </div>
        </div>
      </section>
      <EditorButtons submitLabel="Сохранить категорию" />
    </form>
  );
}

function VariantEditForm({
  entity,
  submitLabel,
  onSubmit,
}: {
  entity: PassVariant | PassPlanGroup;
  submitLabel: string;
  onSubmit: (payload: VariantPayload) => SubmitResult;
}) {
  return (
    <form className={styles.editorForm} onSubmit={(event) => handleVariantSubmit(event, onSubmit)}>
      <BasicVariantFields entity={entity} />
      <EditorButtons submitLabel={submitLabel} />
    </form>
  );
}

function PlanForm({
  plan,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  plan?: PassPlan;
  submitLabel: string;
  onSubmit: (payload: PlanPayload) => SubmitResult;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<PlanDraft>(() => createPlanDraft(plan));

  useEffect(() => {
    setDraft(createPlanDraft(plan));
  }, [plan]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    return onSubmit(parsePlanDraft(draft));
  };

  return (
    <form className={styles.editorForm} onSubmit={handleSubmit}>
      <div className={styles.editorLayout}>
        <div className={styles.editorMain}>
          <FormSection title="Основное">
            <div className={styles.formGrid}>
              <InputField
                name="title"
                label="Название"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                required
              />
              <InputField
                name="slug"
                label="Slug"
                value={draft.slug}
                onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))}
                required
              />
            </div>
            <InputField
              name="subtitle"
              label="Подзаголовок"
              value={draft.subtitle}
              onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))}
            />
            <TextAreaField
              name="description"
              label="Описание"
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
          </FormSection>

          <FormSection title="Цена и срок">
            <div className={styles.formGrid}>
              <InputField
                name="price"
                label="Цена"
                type="number"
                min="0"
                value={draft.price}
                onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))}
                required
              />
              <InputField
                name="currency"
                label="Валюта"
                value={draft.currency}
                onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value }))}
              />
            </div>
            <div className={styles.formGrid}>
              <InputField
                name="durationValue"
                label="Срок"
                type="number"
                min="0"
                value={draft.durationValue}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, durationValue: event.target.value }))
                }
              />
              <SelectField
                name="durationUnit"
                label="Единица срока"
                value={draft.durationUnit}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, durationUnit: event.target.value }))
                }
                options={DURATION_UNIT_OPTIONS}
              />
            </div>
          </FormSection>

          <FormSection title="Логика тарифа">
            <div className={styles.formGrid}>
              <InputField
                name="visitCount"
                label="Посещений"
                type="number"
                min="0"
                value={draft.visitCount}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, visitCount: event.target.value }))
                }
              />
              <SelectField
                name="billingType"
                label="Тип тарифа"
                value={draft.billingType}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, billingType: event.target.value }))
                }
                options={BILLING_TYPE_OPTIONS}
              />
            </div>
            <div className={styles.formGrid}>
              <SelectField
                name="highlightStyle"
                label="Подсветка"
                value={draft.highlightStyle}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, highlightStyle: event.target.value }))
                }
                options={HIGHLIGHT_STYLE_OPTIONS}
              />
              <InputField
                name="sortOrder"
                label="Порядок"
                type="number"
                min="0"
                value={draft.sortOrder}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, sortOrder: event.target.value }))
                }
              />
            </div>
            <CheckboxField
              name="isActive"
              label="Показывать тариф"
              checked={draft.isActive}
              onChange={(event) =>
                setDraft((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
          </FormSection>
        </div>

        <PlanPreview draft={draft} />
      </div>

      <EditorButtons submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}

function BadgeForm({
  badge,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  badge?: PassBadge;
  submitLabel: string;
  onSubmit: (payload: BadgePayload) => SubmitResult;
  onCancel?: () => void;
}) {
  return (
    <form className={styles.editorForm} onSubmit={(event) => handleBadgeSubmit(event, onSubmit)}>
      <FormSection title="Бейдж">
        <div className={styles.formGrid}>
          <InputField name="label" label="Текст" defaultValue={badge?.label ?? ""} required />
          <SelectField
            name="style"
            label="Стиль"
            defaultValue={badge?.style ?? ""}
            options={BADGE_STYLE_OPTIONS}
          />
        </div>
        <InputField
          name="sortOrder"
          label="Порядок"
          type="number"
          min="0"
          defaultValue={badge ? String(badge.sortOrder) : ""}
        />
      </FormSection>
      <EditorButtons submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}

function FeatureForm({
  feature,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  feature?: PassFeature;
  submitLabel: string;
  onSubmit: (payload: FeaturePayload) => SubmitResult;
  onCancel?: () => void;
}) {
  return (
    <form className={styles.editorForm} onSubmit={(event) => handleFeatureSubmit(event, onSubmit)}>
      <FormSection title="Преимущество">
        <div className={styles.formGrid}>
          <InputField name="label" label="Текст" defaultValue={feature?.label ?? ""} required />
          <SelectField
            name="icon"
            label="Иконка"
            defaultValue={feature?.icon ?? "GIFT"}
            options={FEATURE_ICON_OPTIONS}
          />
        </div>
        <InputField
          name="sortOrder"
          label="Порядок"
          type="number"
          min="0"
          defaultValue={feature ? String(feature.sortOrder) : ""}
        />
      </FormSection>
      <EditorButtons submitLabel={submitLabel} onCancel={onCancel} />
    </form>
  );
}

function PlanPreview({ draft }: { draft: PlanDraft }) {
  const badges = getPreviewBadges(draft.badges);
  const features = draft.features;
  const previewPrice = Number(draft.price) > 0 ? Number(draft.price) : 0;
  const previewCurrency = draft.currency.trim() || "RUB";

  return (
    <aside className={styles.previewCard}>
      <div className={styles.previewHeader}>
        <div className={styles.previewLabel}>
          <Eye size={16} />
          Превью
        </div>
        <p className={styles.previewMeta}>Как карточка выглядит на витрине</p>
      </div>

      <article
        className={[
          styles.previewPlanCard,
          draft.highlightStyle === "popular" ? styles.previewPlanCardHighlighted : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {badges.topBadges.length > 0 ? (
          <div className={styles.previewBadgesTop}>
            {badges.topBadges.map((badge) => (
              <span
                key={badge.id}
                className={[
                  styles.previewBadge,
                  badge.style === "featured"
                    ? styles.previewBadgeFeatured
                    : styles.previewBadgeDefault,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {badge.label}
              </span>
            ))}
          </div>
        ) : null}

        <div className={styles.previewPlanMain}>
          <div className={styles.previewPlanCopy}>
            <h4 className={styles.previewPlanTitle}>{draft.title.trim() || "Новый тариф"}</h4>
            {draft.description.trim() ? (
              <p className={styles.previewPlanDescription}>{draft.description.trim()}</p>
            ) : draft.subtitle.trim() ? (
              <p className={styles.previewPlanDescription}>{draft.subtitle.trim()}</p>
            ) : (
              <p className={styles.previewPlanDescription}>Короткое описание появится здесь.</p>
            )}

            {features.length > 0 ? (
              <ul className={styles.previewFeatureList}>
                {features.map((feature) => (
                  <li key={feature.id} className={styles.previewFeatureItem}>
                    <FeatureIcon
                      icon={findFeatureIconOption(feature.icon)}
                      className={styles.previewFeatureIcon}
                    />
                    <span>{feature.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className={styles.previewPlanAside}>
            <div className={styles.previewPlanPrice}>
              {formatPlanPrice(previewPrice, previewCurrency)}
            </div>
            <button type="button" className={styles.previewPlanAction} disabled>
              Выбрать
            </button>
          </div>
        </div>

        {badges.footerBadge ? (
          <div className={styles.previewFooter}>
            <span className={[styles.previewBadge, styles.previewBadgeSuccess].join(" ")}>
              {badges.footerBadge.label}
            </span>
          </div>
        ) : null}
      </article>

      <div className={styles.previewFacts}>
        <span className={styles.previewFact}>
          {formatBillingType(draft.billingType || null)}
        </span>
        <span className={styles.previewFact}>
          {draft.durationValue
            ? `${draft.durationValue} ${formatDurationUnit(draft.durationUnit || null)}`
            : "Срок не задан"}
        </span>
        <span className={styles.previewFact}>
          {formatHighlightStyle(draft.highlightStyle || null)}
        </span>
      </div>
    </aside>
  );
}

function FeatureIcon({
  icon,
  className,
}: {
  icon: PassFeatureIcon;
  className?: string;
}) {
  const Icon = FEATURE_ICON_MAP[icon] ?? Gift;
  return <Icon className={className} aria-hidden="true" />;
}

function CreateChildForm({
  createMode,
  onSubmit,
  onCancel,
}: {
  createMode: ChildCreateMode;
  onSubmit: (
    payload: CategoryPayload | VariantPayload | PlanPayload | BadgePayload | FeaturePayload,
  ) => SubmitResult;
  onCancel: () => void;
}) {
  if (createMode.kind === "variant" || createMode.kind === "group") {
    return (
      <form className={styles.editorForm} onSubmit={(event) => handleVariantSubmit(event, onSubmit)}>
        <BasicVariantFields />
        <EditorButtons submitLabel="Создать" onCancel={onCancel} />
      </form>
    );
  }

  if (createMode.kind === "plan") {
    return (
      <PlanForm submitLabel="Создать тариф" onCancel={onCancel} onSubmit={(payload) => onSubmit(payload)} />
    );
  }

  if (createMode.kind === "feature") {
    return (
      <FeatureForm submitLabel="Создать преимущество" onCancel={onCancel} onSubmit={onSubmit} />
    );
  }

  return (
    <BadgeForm submitLabel="Создать бейдж" onCancel={onCancel} onSubmit={onSubmit} />
  );
}

function BasicCategoryFields({ category }: { category?: PassCategoryDetails }) {
  return (
    <>
      <FormSection title="Основное">
        <div className={styles.formGrid}>
          <InputField name="title" label="Название" defaultValue={category?.title ?? ""} required />
          <InputField name="slug" label="Slug" defaultValue={category?.slug ?? ""} required />
        </div>
        <TextAreaField
          name="description"
          label="Описание"
          defaultValue={category?.description ?? ""}
        />
      </FormSection>

      <FormSection title="Отображение">
        <div className={styles.formGrid}>
          <InputField
            name="sortOrder"
            label="Порядок"
            type="number"
            min="0"
            defaultValue={category ? String(category.sortOrder) : ""}
          />
        </div>
        <CheckboxField name="isActive" label="Показывать категорию" defaultChecked={category?.isActive ?? true} />
      </FormSection>
    </>
  );
}

function BasicVariantFields({ entity }: { entity?: PassVariant | PassPlanGroup }) {
  return (
    <>
      <FormSection title="Основное">
        <div className={styles.formGrid}>
          <InputField name="title" label="Название" defaultValue={entity?.title ?? ""} required />
          <InputField name="slug" label="Slug" defaultValue={entity?.slug ?? ""} required />
        </div>
        <TextAreaField
          name="description"
          label="Описание"
          defaultValue={entity?.description ?? ""}
        />
      </FormSection>
      <FormSection title="Параметры">
        <div className={styles.formGrid}>
          <InputField
            name="sortOrder"
            label="Порядок"
            type="number"
            min="0"
            defaultValue={entity ? String(entity.sortOrder) : ""}
          />
          <CheckboxField
            name="isActive"
            label="Показывать элемент"
            defaultChecked={entity?.isActive ?? true}
          />
        </div>
      </FormSection>
    </>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.formSection}>
      <h4 className={styles.formSectionTitle}>{title}</h4>
      {children}
    </section>
  );
}

function InputField({
  name,
  label,
  defaultValue,
  value,
  onChange,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        className={styles.input}
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        {...props}
      />
    </label>
  );
}

function TextAreaField({
  name,
  label,
  defaultValue,
  value,
  onChange,
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  name: string;
  label: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <textarea
        className={styles.textarea}
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
      />
    </label>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  value,
  onChange,
  options,
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  name: string;
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <select
        className={styles.input}
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({
  name,
  label,
  defaultChecked,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}) {
  return (
    <label className={styles.checkboxRow}>
      <input
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
}

function EditorButtons({
  submitLabel,
  onCancel,
}: {
  submitLabel: string;
  onCancel?: () => void;
}) {
  return (
    <div className={styles.editorButtons}>
      <button type="submit" className={styles.actionButton}>
        {submitLabel}
      </button>
      {onCancel ? (
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          Отмена
        </button>
      ) : null}
    </div>
  );
}

function findNode(categories: PassCategoryDetails[], selected: SelectedAdminNode): FoundNode | null {
  if (!selected) {
    return null;
  }

  for (const category of categories) {
    if (selected.kind === "category" && selected.id === category.id) {
      return { kind: "category", category };
    }

    for (const variant of category.variants) {
      if (selected.kind === "variant" && selected.id === variant.id) {
        return { kind: "variant", category, variant };
      }

      for (const group of variant.groups) {
        if (selected.kind === "group" && selected.id === group.id) {
          return { kind: "group", category, variant, group };
        }

        for (const plan of group.plans) {
          if (selected.kind === "plan" && selected.id === plan.id) {
            return { kind: "plan", category, variant, group, plan };
          }

          for (const feature of plan.features) {
            if (selected.kind === "feature" && selected.id === feature.id) {
              return { kind: "feature", category, variant, group, plan, feature };
            }
          }

          for (const badge of plan.badges) {
            if (selected.kind === "badge" && selected.id === badge.id) {
              return { kind: "badge", category, variant, group, plan, badge };
            }
          }
        }
      }
    }
  }

  return null;
}

function buildExpandedState(categories: PassCategoryDetails[]) {
  const next: Record<string, boolean> = {};

  for (const category of categories) {
    next[`category:${category.id}`] = false;

    for (const variant of category.variants) {
      next[`variant:${variant.id}`] = false;

      for (const group of variant.groups) {
        next[`group:${group.id}`] = false;

        for (const plan of group.plans) {
          next[`plan:${plan.id}`] = false;
        }
      }
    }
  }

  return next;
}

function preserveExpandedState(
  categories: PassCategoryDetails[],
  current: Record<string, boolean>,
) {
  const base = buildExpandedState(categories);
  const next: Record<string, boolean> = {};

  for (const key of Object.keys(base)) {
    next[key] = current[key] ?? base[key];
  }

  return next;
}

function getSelectedTitle(selected: FoundNode) {
  switch (selected.kind) {
    case "category":
      return selected.category.title;
    case "variant":
      return selected.variant.title;
    case "group":
      return selected.group.title;
    case "plan":
      return selected.plan.title;
    case "badge":
      return selected.badge.label;
    case "feature":
      return selected.feature.label;
  }
}

function getSelectedPath(selected: FoundNode) {
  switch (selected.kind) {
    case "category":
      return selected.category.title;
    case "variant":
      return `${selected.category.title} / ${selected.variant.title}`;
    case "group":
      return `${selected.category.title} / ${selected.variant.title} / ${selected.group.title}`;
    case "plan":
      return `${selected.category.title} / ${selected.variant.title} / ${selected.group.title} / ${selected.plan.title}`;
    case "badge":
      return `${selected.plan.title} / Бейдж`;
    case "feature":
      return `${selected.plan.title} / Преимущество`;
  }
}

function getSelectedMeta(selected: FoundNode) {
  switch (selected.kind) {
    case "category":
      return `Slug: ${selected.category.slug}`;
    case "variant":
      return `Slug: ${selected.variant.slug}`;
    case "group":
      return `Slug: ${selected.group.slug}`;
    case "plan":
      return `${formatPlanPrice(selected.plan.price, selected.plan.currency)} • ${formatBillingType(selected.plan.billingType)}`;
    case "badge":
      return `Стиль: ${formatBadgeStyle(selected.badge.style)}`;
    case "feature":
      return `Иконка: ${formatFeatureIcon(selected.feature.icon)}`;
  }
}

function getCreateActions(selected: FoundNode): ChildCreateMode[] {
  switch (selected.kind) {
    case "category":
      return [{ kind: "variant", parentId: selected.category.id }];
    case "variant":
      return [{ kind: "group", parentId: selected.variant.id }];
    case "group":
      return [{ kind: "plan", parentId: selected.group.id }];
    case "plan":
      return [
        { kind: "feature", parentId: selected.plan.id },
        { kind: "badge", parentId: selected.plan.id },
      ];
    case "badge":
    case "feature":
      return [];
  }
}

function getCreateActionLabel(kind: Exclude<CreateMode, null>["kind"]) {
  switch (kind) {
    case "variant":
      return "Подпункт";
    case "group":
      return "Группа";
    case "plan":
      return "Тариф";
    case "badge":
      return "Бейдж";
    case "feature":
      return "Преимущество";
    case "category":
      return "Категория";
  }
}

function getDeletePath(selected: FoundNode) {
  switch (selected.kind) {
    case "category":
      return `/admin/passes/categories/${selected.category.id}`;
    case "variant":
      return `/admin/passes/variants/${selected.variant.id}`;
    case "group":
      return `/admin/passes/groups/${selected.group.id}`;
    case "plan":
      return `/admin/passes/plans/${selected.plan.id}`;
    case "badge":
      return `/admin/passes/badges/${selected.badge.id}`;
    case "feature":
      return `/admin/passes/features/${selected.feature.id}`;
  }
}

function getDeleteConfirmation(selected: FoundNode) {
  switch (selected.kind) {
    case "category":
      return "Удалить категорию и все вложенные сущности?";
    case "variant":
      return "Удалить подпункт и все вложенные сущности?";
    case "group":
      return "Удалить группу и все вложенные сущности?";
    case "plan":
      return "Удалить тариф и все его бейджи/преимущества?";
    case "badge":
      return "Удалить бейдж?";
    case "feature":
      return "Удалить преимущество?";
  }
}

function getDeletePendingMessage(selected: FoundNode) {
  switch (selected.kind) {
    case "category":
      return "Удаляем категорию...";
    case "variant":
      return "Удаляем подпункт...";
    case "group":
      return "Удаляем группу...";
    case "plan":
      return "Удаляем тариф...";
    case "badge":
      return "Удаляем бейдж...";
    case "feature":
      return "Удаляем преимущество...";
  }
}

function getDeleteSuccessMessage(selected: FoundNode) {
  switch (selected.kind) {
    case "category":
      return "Категория удалена";
    case "variant":
      return "Подпункт удалён";
    case "group":
      return "Группа удалена";
    case "plan":
      return "Тариф удалён";
    case "badge":
      return "Бейдж удалён";
    case "feature":
      return "Преимущество удалено";
  }
}

function getDeleteErrorMessage(selected: FoundNode) {
  switch (selected.kind) {
    case "category":
      return "Не удалось удалить категорию";
    case "variant":
      return "Не удалось удалить подпункт";
    case "group":
      return "Не удалось удалить группу";
    case "plan":
      return "Не удалось удалить тариф";
    case "badge":
      return "Не удалось удалить бейдж";
    case "feature":
      return "Не удалось удалить преимущество";
  }
}

function getCreateTitle(kind: Exclude<CreateMode, null>["kind"]) {
  switch (kind) {
    case "category":
      return "Новая категория";
    case "variant":
      return "Новый подпункт";
    case "group":
      return "Новая группа";
    case "plan":
      return "Новый тариф";
    case "badge":
      return "Новый бейдж";
    case "feature":
      return "Новое преимущество";
  }
}

function getCreateSuccessMessage(kind: ChildCreateMode["kind"]) {
  switch (kind) {
    case "variant":
      return "Подпункт создан";
    case "group":
      return "Группа создана";
    case "plan":
      return "Тариф создан";
    case "badge":
      return "Бейдж создан";
    case "feature":
      return "Преимущество создано";
  }
}

function getCreateErrorMessage(kind: ChildCreateMode["kind"]) {
  switch (kind) {
    case "variant":
      return "Не удалось создать подпункт";
    case "group":
      return "Не удалось создать группу";
    case "plan":
      return "Не удалось создать тариф";
    case "badge":
      return "Не удалось создать бейдж";
    case "feature":
      return "Не удалось создать преимущество";
  }
}

async function createChild(
  createMode: ChildCreateMode,
  payload: CategoryPayload | VariantPayload | PlanPayload | BadgePayload | FeaturePayload,
) {
  switch (createMode.kind) {
    case "variant":
      return apiFetch<PassCategoryDetails>(
        `/admin/passes/categories/${createMode.parentId}/variants`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    case "group":
      return apiFetch<PassCategoryDetails>(
        `/admin/passes/variants/${createMode.parentId}/groups`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    case "plan":
      return apiFetch<PassCategoryDetails>(
        `/admin/passes/groups/${createMode.parentId}/plans`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    case "badge":
      return apiFetch<PassCategoryDetails>(
        `/admin/passes/plans/${createMode.parentId}/badges`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
    case "feature":
      return apiFetch<PassCategoryDetails>(
        `/admin/passes/plans/${createMode.parentId}/features`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
  }
}

function findCreatedNode(
  category: PassCategoryDetails,
  createMode: ChildCreateMode,
  payload: CategoryPayload | VariantPayload | PlanPayload | BadgePayload | FeaturePayload,
): NonNullable<SelectedAdminNode> | null {
  const targetTitle =
    "title" in payload ? payload.title : "label" in payload ? payload.label : "";

  if (createMode.kind === "variant") {
    const match = category.variants.find((item) => item.title === targetTitle);
    return match ? { kind: "variant", id: match.id } : { kind: "category", id: category.id };
  }

  for (const variant of category.variants) {
    if (createMode.kind === "group") {
      const match = variant.groups.find((item) => item.title === targetTitle);
      if (match) {
        return { kind: "group", id: match.id };
      }
    }

    for (const group of variant.groups) {
      if (createMode.kind === "plan") {
        const match = group.plans.find((item) => item.title === targetTitle);
        if (match) {
          return { kind: "plan", id: match.id };
        }
      }

      for (const plan of group.plans) {
        if (createMode.kind === "feature") {
          const match = plan.features.find((item) => item.label === targetTitle);
          if (match) {
            return { kind: "feature", id: match.id };
          }
        }

        if (createMode.kind === "badge") {
          const match = plan.badges.find((item) => item.label === targetTitle);
          if (match) {
            return { kind: "badge", id: match.id };
          }
        }
      }
    }
  }

  return null;
}

function handleCategorySubmit(
  event: FormEvent<HTMLFormElement>,
  onSubmit: (payload: CategoryPayload) => SubmitResult,
) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  return onSubmit({
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    description: optionalString(formData.get("description")),
    sortOrder: optionalNumber(formData.get("sortOrder")),
    isActive: formData.get("isActive") === "on",
  });
}

function handleVariantSubmit(
  event: FormEvent<HTMLFormElement>,
  onSubmit: (payload: VariantPayload) => SubmitResult,
) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  return onSubmit({
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    description: optionalString(formData.get("description")),
    sortOrder: optionalNumber(formData.get("sortOrder")),
    isActive: formData.get("isActive") === "on",
  });
}

function parsePlanDraft(draft: PlanDraft): PlanPayload {
  return {
    title: draft.title.trim(),
    slug: draft.slug.trim(),
    description: optionalString(draft.description),
    subtitle: optionalString(draft.subtitle),
    price: Number(draft.price || 0),
    currency: optionalString(draft.currency) ?? "RUB",
    durationValue: optionalNumber(draft.durationValue),
    durationUnit: optionalString(draft.durationUnit),
    visitCount: optionalNumber(draft.visitCount),
    billingType: optionalString(draft.billingType),
    highlightStyle: optionalString(draft.highlightStyle),
    sortOrder: optionalNumber(draft.sortOrder),
    isActive: draft.isActive,
  };
}

function handleBadgeSubmit(
  event: FormEvent<HTMLFormElement>,
  onSubmit: (payload: BadgePayload) => SubmitResult,
) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  return onSubmit({
    label: String(formData.get("label") ?? "").trim(),
    style: optionalString(formData.get("style")),
    sortOrder: optionalNumber(formData.get("sortOrder")),
  });
}

function handleFeatureSubmit(
  event: FormEvent<HTMLFormElement>,
  onSubmit: (payload: FeaturePayload) => SubmitResult,
) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  return onSubmit({
    label: String(formData.get("label") ?? "").trim(),
    icon: String(formData.get("icon") ?? "GIFT").trim(),
    sortOrder: optionalNumber(formData.get("sortOrder")),
  });
}

function optionalString(value: FormDataEntryValue | string | null) {
  const nextValue = String(value ?? "").trim();
  return nextValue.length > 0 ? nextValue : undefined;
}

function optionalNumber(value: FormDataEntryValue | string | null) {
  const nextValue = String(value ?? "").trim();
  return nextValue ? Number(nextValue) : undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    switch (error.message) {
      case "Insufficient permissions":
        return "Недостаточно прав для этого действия.";
      case "Authentication required":
        return "Нужно заново войти в аккаунт.";
      default:
        return error.message;
    }
  }

  return fallback;
}

const FEATURE_ICON_MAP = {
  TICKET: Ticket,
  FLAME: Flame,
  SNOWFLAKE: Snowflake,
  CALENDAR: CalendarDays,
  GIFT: Gift,
  DUMBBELL: Dumbbell,
  POOL: Waves,
  COMBO: Layers3,
} as const;
