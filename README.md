# Redmine Reborn

Браузерное приложение на React и TypeScript для локального учёта времени, просмотра задач и событий Redmine.

## Запуск

Требуется Node.js 24 LTS и npm.

```bash
npm ci
npm run dev
```

Откройте адрес Vite, обычно `http://127.0.0.1:5173/`. Для браузерных API нужен HTTPS либо localhost/loopback. Запуск через `file://` не поддерживается.

```bash
npm run build   # TypeScript + production-билд в dist/
npm run preview # локальная проверка production-билда
```
