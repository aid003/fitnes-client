#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Сообщаем о #hex в пользовательских CSS Modules (админка исключена).
matches=$(grep -R -n -E '#[0-9a-fA-F]{3,8}' src/widgets --include='*.module.css' 2>/dev/null | grep -Ev '/admin-[^/]+/' || true)
if [[ -n "${matches}" ]]; then
  echo "Найдены литеральные цвета #hex в пользовательских *.module.css:" >&2
  echo "${matches}" >&2
  echo "Добавьте токен в src/shared/styles/tokens.css и замените на var(--...)." >&2
  exit 1
fi

echo "OK: пользовательские *.module.css без #hex."
