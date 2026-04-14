# Дизайн-токены (светлая тема)

Цвета и градиенты для пользовательского интерфейса задаются в [`src/shared/styles/tokens.css`](../src/shared/styles/tokens.css). Компоненты и экраны должны ссылаться на **семантические** переменные (`--text-primary`, `--surface-card`, `--accent-primary`, …), а не на «сырые» `#hex` внутри `*.module.css`.

## Слои

1. **Примитивы** — `--color-text`, `--color-button-primary`, `--color-shell-bg` и т.д. (базовая палитра).
2. **Семантика** — `--text-primary`, `--text-secondary`, `--surface-card`, `--border-accent`, `--gradient-screen`, … (смысл в UI).
3. **Спец-экраны** — например `--pass-*` для тёмного блока каталога абонементов.

## Правила

- В [`*.module.css`](../src) пользовательских экранов и [`shared/ui`](../src/shared/ui) **не вводить** новые `#rrggbb` / произвольные `rgba(...)` без добавления токена в `tokens.css`.
- Админские экраны (`admin-*`) пока могут оставаться на локальных цветах; при рефакторинге админки — вынос в отдельные `--admin-*` токены.
- Для фокуса и границ полей использовать `--input-border`, `--accent-outline-focus`, `--border-accent`.
- Ссылки на светлом фоне: `--link-primary`.

## Проверка

```bash
npm run lint:css-tokens
```

Скрипт падает с ошибкой, если в пользовательских `*.module.css` (без `admin-*`) найдены литералы `#hex`.
