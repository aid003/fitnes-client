"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useRequireAdmin } from "@/shared/auth/auth-guards";
import { useAuth } from "@/shared/auth/auth-context";
import { apiFetch, ApiError } from "@/shared/lib/api";
import type {
  PassBadge,
  PassCategoryDetails,
  PassFeature,
  PassPlan,
  PassPlanGroup,
  PassVariant,
} from "@/shared/lib/contracts";
import { SessionStatus } from "@/shared/ui/session-status/session-status";
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
    setExpanded(buildExpandedState(data));
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

  const runAction = async (message: string, action: () => Promise<void>) => {
    try {
      setStatus(message);
      setError(null);
      await action();
    } catch (actionError) {
      setError(getErrorMessage(actionError, "Не удалось выполнить операцию"));
    } finally {
      setStatus(null);
    }
  };

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

  const handleDelete = async (path: string, confirmText: string) => {
    if (!window.confirm(confirmText)) {
      return;
    }

    await apiFetch(path, { method: "DELETE" });
    await loadCategories();
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
          <div>
            <h1 className={styles.title}>Админка абонементов</h1>
            <p className={styles.subtitle}>
              Слева структура каталога, справа редактор выбранной сущности.
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
              Создать категорию
            </button>
            <Link href="/" className={styles.secondaryButton}>
              На главную
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
              <h2 className={styles.panelTitle}>Структура каталога</h2>
              <p className={styles.panelText}>
                Выберите элемент, чтобы редактировать его справа.
              </p>
            </div>

            {isDataLoading ? (
              <p className={styles.panelText}>Загружаем дерево абонементов...</p>
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
              <h2 className={styles.panelTitle}>Редактор</h2>
              <p className={styles.panelText}>
                Изменения применяются только для выбранного элемента.
              </p>
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
                onCreate={(mode) => {
                  setCreateMode(mode);
                }}
                onDelete={async () => {
                  await handleDelete(
                    getDeletePath(selected),
                    getDeleteConfirmation(selected),
                  );
                  setSelectedNode(null);
                  setCreateMode(null);
                }}
              />
            ) : (
              <div className={styles.placeholder}>
                <h3 className={styles.placeholderTitle}>Выберите элемент слева</h3>
                <p className={styles.panelText}>
                  Выберите категорию, подпункт, группу, тариф или бейдж. Либо создайте новую
                  категорию.
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
        meta={`${category.isActive ? "активна" : "скрыта"} • sort ${category.sortOrder}`}
        level={0}
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
              categoryId={category.id}
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
  categoryId,
  variant,
  expanded,
  selectedNode,
  onSelect,
  onToggle,
  onCreate,
}: {
  categoryId: string;
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
        meta={`${variant.isActive ? "активен" : "скрыт"} • sort ${variant.sortOrder}`}
        level={1}
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
              categoryId={categoryId}
              variantId={variant.id}
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
  categoryId: string;
  variantId: string;
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
        meta={`${group.isActive ? "активна" : "скрыта"} • sort ${group.sortOrder}`}
        level={2}
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
        meta={`${plan.isActive ? "активен" : "скрыт"} • ${plan.price} ${formatCurrency(plan.currency)}`}
        level={3}
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
                  meta={`иконка ${formatFeatureIcon(entry.item.icon)} • sort ${entry.item.sortOrder}`}
                  level={4}
                  selected={selectedNode?.kind === "feature" && selectedNode.id === entry.item.id}
                  canExpand={false}
                  expanded={false}
                  onClick={() => onSelect({ kind: "feature", id: entry.item.id })}
                />
              ) : (
                <TreeRow
                  key={entry.item.id}
                  title={entry.item.label}
                  meta={`style ${entry.item.style ?? "—"} • sort ${entry.item.sortOrder}`}
                  level={4}
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
  level,
  selected,
  canExpand,
  expanded,
  onToggle,
  onClick,
  onCreate,
}: {
  title: string;
  meta: string;
  level: number;
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
      style={{ paddingLeft: `${12 + level * 18}px` }}
    >
      <button
        type="button"
        className={styles.treeMain}
        onClick={onClick}
      >
        <span className={styles.treeExpand}>
          {canExpand ? (
            <button
              type="button"
              className={styles.iconButton}
              onClick={(event) => {
                event.stopPropagation();
                onToggle?.();
              }}
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className={styles.dotMarker} />
          )}
        </span>
        <span className={styles.treeText}>
          <span className={styles.treeTitle}>{title}</span>
          <span className={styles.treeMeta}>{meta}</span>
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
  onRunAction: (message: string, action: () => Promise<void>) => Promise<void>;
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
        subtitle="Создайте новую карточку верхнего уровня."
      >
        <CategoryCreateForm
          submitLabel="Создать категорию"
          onSubmit={(payload) =>
            onRunAction("Создаем категорию...", async () => {
              const category = await apiFetch<PassCategoryDetails>("/admin/passes/categories", {
                method: "POST",
                body: JSON.stringify(payload),
              });
              onCreatedCategory(category);
            })
          }
          onCancel={onCancel}
        />
      </EditorCard>
    );
  }

  return (
    <EditorCard
      title={getCreateTitle(createMode.kind)}
      subtitle={selected ? `Родитель: ${getSelectedTitle(selected)}` : "Создание дочернего элемента"}
    >
      <CreateChildForm
        createMode={createMode}
        onCancel={onCancel}
        onSubmit={(payload) =>
          onRunAction("Создаем элемент...", async () => {
            const response = await createChild(createMode, payload);
            const nextNode = findCreatedNode(response, createMode, payload);

            if (nextNode) {
              onUpdatedCategory(response, nextNode);
            } else {
              onUpdatedCategory(response, { kind: "category", id: response.id });
            }
          })
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
  onRunAction: (message: string, action: () => Promise<void>) => Promise<void>;
  onReplaceCategory: (category: PassCategoryDetails) => void;
  onCreate: (mode: CreateMode) => void;
  onDelete: () => Promise<void>;
}) {
  const commonMeta = getSelectedMeta(selected);

  return (
    <EditorCard title={getSelectedTitle(selected)} subtitle={commonMeta}>
      <div className={styles.editorActions}>
        {getCreateActions(selected).map((action) => (
          <button
            key={action.kind}
            type="button"
            className={styles.secondaryButton}
            onClick={() => onCreate(action)}
          >
            <Plus size={16} />
            {getCreateActionLabel(action.kind)}
          </button>
        ))}
        <button type="button" className={styles.dangerButton} onClick={() => void onDelete()}>
          <Trash2 size={16} />
          Удалить
        </button>
      </div>

      {selected.kind === "category" ? (
        <CategoryEditForm
          category={selected.category}
          onSubmit={(payload) =>
            onRunAction("Сохраняем категорию...", async () => {
              const category = await apiFetch<PassCategoryDetails>(
                `/admin/passes/categories/${selected.category.id}`,
                {
                  method: "PATCH",
                  body: JSON.stringify(payload),
                },
              );
              onReplaceCategory(category);
            })
          }
        />
      ) : null}

      {selected.kind === "variant" ? (
        <VariantEditForm
          entity={selected.variant}
          submitLabel="Сохранить подпункт"
          onSubmit={(payload) =>
            onRunAction("Сохраняем подпункт...", async () => {
              const category = await apiFetch<PassCategoryDetails>(
                `/admin/passes/variants/${selected.variant.id}`,
                {
                  method: "PATCH",
                  body: JSON.stringify(payload),
                },
              );
              onReplaceCategory(category);
            })
          }
        />
      ) : null}

      {selected.kind === "group" ? (
        <VariantEditForm
          entity={selected.group}
          submitLabel="Сохранить группу"
          onSubmit={(payload) =>
            onRunAction("Сохраняем группу...", async () => {
              const category = await apiFetch<PassCategoryDetails>(
                `/admin/passes/groups/${selected.group.id}`,
                {
                  method: "PATCH",
                  body: JSON.stringify(payload),
                },
              );
              onReplaceCategory(category);
            })
          }
        />
      ) : null}

      {selected.kind === "plan" ? (
        <PlanEditForm
          plan={selected.plan}
          onSubmit={(payload) =>
            onRunAction("Сохраняем тариф...", async () => {
              const category = await apiFetch<PassCategoryDetails>(
                `/admin/passes/plans/${selected.plan.id}`,
                {
                  method: "PATCH",
                  body: JSON.stringify(payload),
                },
              );
              onReplaceCategory(category);
            })
          }
        />
      ) : null}

      {selected.kind === "badge" ? (
        <BadgeEditForm
          badge={selected.badge}
          onSubmit={(payload) =>
            onRunAction("Сохраняем бейдж...", async () => {
              const category = await apiFetch<PassCategoryDetails>(
                `/admin/passes/badges/${selected.badge.id}`,
                {
                  method: "PATCH",
                  body: JSON.stringify(payload),
                },
              );
              onReplaceCategory(category);
            })
          }
        />
      ) : null}

      {selected.kind === "feature" ? (
        <FeatureEditForm
          feature={selected.feature}
          onSubmit={(payload) =>
            onRunAction("Сохраняем преимущество...", async () => {
              const category = await apiFetch<PassCategoryDetails>(
                `/admin/passes/features/${selected.feature.id}`,
                {
                  method: "PATCH",
                  body: JSON.stringify(payload),
                },
              );
              onReplaceCategory(category);
            })
          }
        />
      ) : null}
    </EditorCard>
  );
}

function EditorCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.editorCard}>
      <div className={styles.editorHeader}>
        <h3 className={styles.editorTitle}>{title}</h3>
        <p className={styles.panelText}>{subtitle}</p>
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
  onSubmit: (payload: CategoryPayload) => Promise<void>;
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
}: {
  category: PassCategoryDetails;
  onSubmit: (payload: CategoryPayload) => Promise<void>;
}) {
  return (
    <form className={styles.editorForm} onSubmit={(event) => handleCategorySubmit(event, onSubmit)}>
      <BasicCategoryFields category={category} />
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
  onSubmit: (payload: VariantPayload) => Promise<void>;
}) {
  return (
    <form className={styles.editorForm} onSubmit={(event) => handleVariantSubmit(event, onSubmit)}>
      <BasicVariantFields entity={entity} />
      <EditorButtons submitLabel={submitLabel} />
    </form>
  );
}

function PlanEditForm({
  plan,
  onSubmit,
}: {
  plan: PassPlan;
  onSubmit: (payload: PlanPayload) => Promise<void>;
}) {
  return (
    <form className={styles.editorForm} onSubmit={(event) => handlePlanSubmit(event, onSubmit)}>
      <FormSection title="Основное">
        <div className={styles.formGrid}>
          <InputField name="title" label="Название" defaultValue={plan.title} required />
          <InputField name="slug" label="Slug" defaultValue={plan.slug} required />
        </div>
        <TextAreaField
          name="description"
          label="Описание"
          defaultValue={plan.description ?? ""}
        />
        <InputField
          name="subtitle"
          label="Подзаголовок"
          defaultValue={plan.subtitle ?? ""}
        />
      </FormSection>

      <FormSection title="Цена и валюта">
        <div className={styles.formGrid}>
          <InputField
            name="price"
            label="Цена"
            type="number"
            min="0"
            defaultValue={String(plan.price)}
            required
          />
          <InputField name="currency" label="Валюта" defaultValue={plan.currency} />
        </div>
      </FormSection>

      <FormSection title="Срок и посещения">
        <div className={styles.formGrid}>
          <InputField
            name="durationValue"
            label="Срок"
            type="number"
            min="0"
            defaultValue={plan.durationValue ? String(plan.durationValue) : ""}
          />
          <InputField
            name="durationUnit"
            label="Единица срока"
            defaultValue={plan.durationUnit ?? ""}
          />
        </div>
        <div className={styles.formGrid}>
          <InputField
            name="visitCount"
            label="Кол-во посещений"
            type="number"
            min="0"
            defaultValue={plan.visitCount ? String(plan.visitCount) : ""}
          />
          <InputField
            name="billingType"
            label="Тип тарифа"
            defaultValue={plan.billingType ?? ""}
          />
        </div>
      </FormSection>

      <FormSection title="Оформление">
        <div className={styles.formGrid}>
          <InputField
            name="highlightStyle"
            label="Стиль подсветки"
            defaultValue={plan.highlightStyle ?? ""}
          />
          <InputField
            name="sortOrder"
            label="Порядок"
            type="number"
            min="0"
            defaultValue={String(plan.sortOrder)}
          />
        </div>
        <CheckboxField name="isActive" label="Активен" defaultChecked={plan.isActive} />
      </FormSection>

      <EditorButtons submitLabel="Сохранить тариф" />
    </form>
  );
}

function BadgeEditForm({
  badge,
  onSubmit,
}: {
  badge: PassBadge;
  onSubmit: (payload: BadgePayload) => Promise<void>;
}) {
  return (
    <form className={styles.editorForm} onSubmit={(event) => handleBadgeSubmit(event, onSubmit)}>
      <FormSection title="Бейдж">
        <div className={styles.formGrid}>
          <InputField name="label" label="Текст" defaultValue={badge.label} required />
          <InputField name="style" label="Стиль" defaultValue={badge.style ?? ""} />
        </div>
        <InputField
          name="sortOrder"
          label="Порядок"
          type="number"
          min="0"
          defaultValue={String(badge.sortOrder)}
        />
      </FormSection>
      <EditorButtons submitLabel="Сохранить бейдж" />
    </form>
  );
}

function FeatureEditForm({
  feature,
  onSubmit,
}: {
  feature: PassFeature;
  onSubmit: (payload: FeaturePayload) => Promise<void>;
}) {
  return (
    <form className={styles.editorForm} onSubmit={(event) => handleFeatureSubmit(event, onSubmit)}>
      <FeatureFields feature={feature} />
      <EditorButtons submitLabel="Сохранить преимущество" />
    </form>
  );
}

function CreateChildForm({
  createMode,
  onSubmit,
  onCancel,
}: {
  createMode: Exclude<CreateMode, { kind: "category" } | null>;
  onSubmit: (
    payload: CategoryPayload | VariantPayload | PlanPayload | BadgePayload | FeaturePayload,
  ) => Promise<void>;
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
      <form className={styles.editorForm} onSubmit={(event) => handlePlanSubmit(event, onSubmit)}>
        <PlanEditFormDefaults />
        <EditorButtons submitLabel="Создать тариф" onCancel={onCancel} />
      </form>
    );
  }

  if (createMode.kind === "feature") {
    return (
      <form className={styles.editorForm} onSubmit={(event) => handleFeatureSubmit(event, onSubmit)}>
        <FeatureFields />
        <EditorButtons submitLabel="Создать преимущество" onCancel={onCancel} />
      </form>
    );
  }

  return (
    <form className={styles.editorForm} onSubmit={(event) => handleBadgeSubmit(event, onSubmit)}>
      <FormSection title="Бейдж">
        <div className={styles.formGrid}>
          <InputField name="label" label="Текст" required />
          <InputField name="style" label="Стиль" />
        </div>
        <InputField name="sortOrder" label="Порядок" type="number" min="0" />
      </FormSection>
      <EditorButtons submitLabel="Создать бейдж" onCancel={onCancel} />
    </form>
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
            name="coverImageUrl"
            label="Картинка"
            defaultValue={category?.coverImageUrl ?? ""}
          />
          <InputField
            name="sortOrder"
            label="Порядок"
            type="number"
            min="0"
            defaultValue={category ? String(category.sortOrder) : ""}
          />
        </div>
        <CheckboxField name="isActive" label="Активна" defaultChecked={category?.isActive ?? true} />
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
            label="Активен"
            defaultChecked={entity?.isActive ?? true}
          />
        </div>
      </FormSection>
    </>
  );
}

function PlanEditFormDefaults() {
  return (
    <>
      <FormSection title="Основное">
        <div className={styles.formGrid}>
          <InputField name="title" label="Название" required />
          <InputField name="slug" label="Slug" required />
        </div>
        <TextAreaField name="description" label="Описание" />
        <InputField name="subtitle" label="Подзаголовок" />
      </FormSection>

      <FormSection title="Цена и валюта">
        <div className={styles.formGrid}>
          <InputField name="price" label="Цена" type="number" min="0" required />
          <InputField name="currency" label="Валюта" defaultValue="RUB" />
        </div>
      </FormSection>

      <FormSection title="Срок и посещения">
        <div className={styles.formGrid}>
          <InputField name="durationValue" label="Срок" type="number" min="0" />
          <InputField name="durationUnit" label="Единица срока" />
        </div>
        <div className={styles.formGrid}>
          <InputField name="visitCount" label="Кол-во посещений" type="number" min="0" />
          <InputField name="billingType" label="Тип тарифа" />
        </div>
      </FormSection>

      <FormSection title="Оформление">
        <div className={styles.formGrid}>
          <InputField name="highlightStyle" label="Стиль подсветки" />
          <InputField name="sortOrder" label="Порядок" type="number" min="0" />
        </div>
        <CheckboxField name="isActive" label="Активен" defaultChecked />
      </FormSection>
    </>
  );
}

function FeatureFields({ feature }: { feature?: PassFeature }) {
  return (
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
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
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
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  label: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={styles.input} name={name} defaultValue={defaultValue} {...props} />
    </label>
  );
}

function TextAreaField({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <textarea className={styles.textarea} name={name} defaultValue={defaultValue} />
    </label>
  );
}

function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <select className={styles.input} name={name} defaultValue={defaultValue}>
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
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className={styles.checkboxRow}>
      <input name={name} type="checkbox" defaultChecked={defaultChecked} />
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
    next[`category:${category.id}`] = true;
    for (const variant of category.variants) {
      next[`variant:${variant.id}`] = true;
      for (const group of variant.groups) {
        next[`group:${group.id}`] = true;
        for (const plan of group.plans) {
          next[`plan:${plan.id}`] = plan.features.length + plan.badges.length > 0;
        }
      }
    }
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

function getSelectedMeta(selected: FoundNode) {
  switch (selected.kind) {
    case "category":
      return `Категория • ${selected.category.slug}`;
    case "variant":
      return `${selected.category.title} → подпункт • ${selected.variant.slug}`;
    case "group":
      return `${selected.variant.title} → группа • ${selected.group.slug}`;
    case "plan":
      return `${selected.group.title} → тариф • ${selected.plan.price} ${formatCurrency(selected.plan.currency)}`;
    case "badge":
      return `${selected.plan.title} → бейдж • ${selected.badge.style ?? "без стиля"}`;
    case "feature":
      return `${selected.plan.title} → преимущество • ${formatFeatureIcon(selected.feature.icon)}`;
  }
}

function getCreateActions(selected: FoundNode): Exclude<CreateMode, null>[] {
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
      return [];
    case "feature":
      return [];
  }
}

function getCreateActionLabel(kind: Exclude<CreateMode, null>["kind"]) {
  switch (kind) {
    case "variant":
      return "Добавить подпункт";
    case "group":
      return "Добавить группу";
    case "plan":
      return "Добавить тариф";
    case "badge":
      return "Добавить бейдж";
    case "feature":
      return "Добавить преимущество";
    case "category":
      return "Создать категорию";
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

async function createChild(
  createMode: Exclude<CreateMode, { kind: "category" } | null>,
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
  createMode: Exclude<CreateMode, { kind: "category" } | null>,
  payload: CategoryPayload | VariantPayload | PlanPayload | BadgePayload | FeaturePayload,
): NonNullable<SelectedAdminNode> | null {
  const targetTitle =
    "title" in payload
      ? payload.title
      : "label" in payload
        ? payload.label
        : "";

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
  onSubmit: (payload: CategoryPayload) => Promise<void>,
) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  return onSubmit({
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    description: optionalString(formData.get("description")),
    coverImageUrl: optionalString(formData.get("coverImageUrl")),
    sortOrder: optionalNumber(formData.get("sortOrder")),
    isActive: formData.get("isActive") === "on",
  });
}

function handleVariantSubmit(
  event: FormEvent<HTMLFormElement>,
  onSubmit: (payload: VariantPayload) => Promise<void>,
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

function handlePlanSubmit(
  event: FormEvent<HTMLFormElement>,
  onSubmit: (payload: PlanPayload) => Promise<void>,
) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  return onSubmit({
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    price: Number(formData.get("price") ?? 0),
    description: optionalString(formData.get("description")),
    subtitle: optionalString(formData.get("subtitle")),
    currency: optionalString(formData.get("currency")) ?? "RUB",
    durationValue: optionalNumber(formData.get("durationValue")),
    durationUnit: optionalString(formData.get("durationUnit")),
    visitCount: optionalNumber(formData.get("visitCount")),
    billingType: optionalString(formData.get("billingType")),
    highlightStyle: optionalString(formData.get("highlightStyle")),
    sortOrder: optionalNumber(formData.get("sortOrder")),
    isActive: formData.get("isActive") === "on",
  });
}

function handleBadgeSubmit(
  event: FormEvent<HTMLFormElement>,
  onSubmit: (payload: BadgePayload) => Promise<void>,
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
  onSubmit: (payload: FeaturePayload) => Promise<void>,
) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  return onSubmit({
    label: String(formData.get("label") ?? "").trim(),
    icon: String(formData.get("icon") ?? "GIFT").trim(),
    sortOrder: optionalNumber(formData.get("sortOrder")),
  });
}

function optionalString(value: FormDataEntryValue | null) {
  const nextValue = String(value ?? "").trim();
  return nextValue.length > 0 ? nextValue : undefined;
}

function optionalNumber(value: FormDataEntryValue | null) {
  const nextValue = String(value ?? "").trim();
  return nextValue ? Number(nextValue) : undefined;
}

function formatCurrency(currency: string) {
  return currency === "RUB" ? "₽" : currency;
}

function formatFeatureIcon(icon: string) {
  return FEATURE_ICON_OPTIONS.find((option) => option.value === icon)?.label ?? icon;
}

const FEATURE_ICON_OPTIONS = [
  { value: "TICKET", label: "Билет" },
  { value: "FLAME", label: "Огонь" },
  { value: "SNOWFLAKE", label: "Снежинка" },
  { value: "CALENDAR", label: "Календарь" },
  { value: "GIFT", label: "Подарок" },
  { value: "DUMBBELL", label: "Гантель" },
  { value: "POOL", label: "Бассейн" },
  { value: "COMBO", label: "Комбо" },
] as const;

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
