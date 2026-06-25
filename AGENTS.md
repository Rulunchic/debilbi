# Debilbi — инструкция для агента

## Репозиторий

```
GitHub: https://github.com/Rulunchic/debilbi
Clone:  git clone https://github.com/Rulunchic/debilbi.git
```

Ветка `main` — продакшн. Пуш в `main` триггерит GitHub Actions деплой на сервер.

## Установка и команды

```bash
npm ci                  # установка зависимостей (только ci, не install)
npm start               # дев-сервер на 0.0.0.0:8080
npm run build           # сборка в dist/
npm run lint            # eslint + prettier проверка
npm run typecheck       # TypeScript проверка типов
```

## Рабочий процесс

1. Создать ветку от `main`: `git checkout -b feature/my-feature`
2. Внести изменения
3. Проверить: `npm run lint && npm run typecheck && npm run build`
4. Закоммитить: `git add . && git commit -m "feat: что сделано"`
5. Запушить: `git push origin feature/my-feature`
6. Открыть Pull Request на GitHub в `main`

Хуки Husky автоматически прогоняют eslint+prettier при коммите через `lint-staged`.

**Никогда не пушить напрямую в `main`**. Только через ветку + PR.

После влития PR владельцем (`Rulunchic`) деплой на сервер срабатывает автоматически через GitHub Actions.

## Настройка MCP GitHub для агента

Агенту нужен доступ к GitHub API через MCP-сервер. Вот как настроить:

### 1. Создать GitHub Personal Access Token

- Зайти на https://github.com/settings/tokens
- Создать **Fine-grained token** (рекомендуется) или **classic token**
- Для fine-grained: выбрать репозиторий `Rulunchic/debilbi`, дать permissions: `Contents: read/write`, `Pull requests: read/write`, `Issues: read/write`
- Скопировать токен

### 2. Настроить в Kilo

Файл `~/.config/kilo/kilo.json` (глобально) или `kilo.json` в корне проекта:

```json
{
  "mcpServers": {
    "github": {
      "type": "github",
      "token": "ghp_ваш_токен"
    }
  }
}
```

Либо через переменную окружения:

```bash
export GITHUB_TOKEN=ghp_ваш_токен
```

### 3. Проверить

Агент должен иметь доступ к инструментам `github_*` — поиск кода, создание файлов, работа с PR и т.д. Если инструменты не появились — токен не настроен или нет нужных permissions.

## Структура проекта

```
debilbi/
├── src/                  # React/TypeScript (форк Cinny)
├── public/               # Статика
├── scripts/              # Скрипты сборки
├── contrib/              # Примеры конфигов nginx/caddy
├── .github/workflows/    # CI/CD (deploy.yml)
├── .husky/               # Git hooks
├── vite.config.js        # Vite конфиг
├── package.json          # Зависимости и скрипты
├── Dockerfile            # Docker-сборка
└── config.json           # Настройки хомсервера Matrix
```

## Ограничения

- Агент не имеет SSH-ключей для деплоя — не может запустить deploy workflow вручную
- Деплой происходит только после влития PR в `main` (владельцем)
- Можно: клонировать, создавать ветки, коммитить, пушить, открывать PR, ревьюить код
