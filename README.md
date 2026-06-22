# Redmine Time Tracker

Кроссплатформенное Electron-приложение на TypeScript и React для локального учёта и отправки времени в Redmine. Renderer собирается через Vite.

## Запуск

### Linux / WSL

Перед первым запуском установите системные библиотеки Electron:

```bash
sudo apt-get update
sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libgtk-3-0 libpango-1.0-0 libcairo2 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libxkbcommon0 \
  libasound2 libatspi2.0-0
```

Для запуска окна из WSL необходим WSLg (Windows 11) либо настроенный X-сервер.
Команда `npm start` автоматически очищает `ELECTRON_RUN_AS_NODE` и добавляет
необходимые для WSL флаги Chromium. Запускайте её из обычного WSL-терминала:

```bash
npm install
npm start
```

## Сборка установщика

```bash
npm run dist
```

`electron-builder` создаёт NSIS для Windows, DMG для macOS, AppImage и DEB для Linux. Собирать установщик каждой ОС рекомендуется на соответствующей ОС.

## Аналитика

Для выбранного месяца доступны отдельные вкладки: редактирование и синхронизация записей, составной график времени по дням, рейтинг задач по трудозатратам и обзор распределения времени по активностям.

## Настройка Redmine

1. Укажите базовый URL Redmine, API-ключ и ID пользователя.
2. Выберите один CA-сертификат (`.pem`, `.crt` или `.cer`).
3. Заполните числовые ID видов деятельности из раздела Redmine «Администрирование → Учёт времени → Виды деятельности».

Данные хранятся локально в каталоге `userData` Electron. Сертификат не копируется: приложение сохраняет путь к выбранному файлу и передаёт его как `ca` HTTPS-агенту только в главном процессе.
