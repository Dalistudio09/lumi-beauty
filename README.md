# Lumi

Telegram Mini App записи в студию красоты Lumi.

Клиент выбирает направление, услугу, мастера и время. Админ — Telegram ID `743736933`.

## Стек

- TanStack Start + React + Vite
- Tailwind CSS
- Postgres по `DATABASE_URL` (Neon на Vercel)
- Telegram Bot API

## Локально

```bash
npm install
cp .env.example .env
# TELEGRAM_BOT_TOKEN — обязательно
# DATABASE_URL — необязательно: без неё локально поднимется PGLite
npm run dev
```

Откроется http://localhost:8080/

## Vercel

На Vercel PGlite **не используется**. Записи и скрытые услуги идут только в Postgres.

1. Залейте репозиторий на GitHub.
2. Import в [Vercel](https://vercel.com/new).
3. Environment Variables:

| Name | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен бота |
| `DATABASE_URL` | строка Neon / Postgres, **обязательна** |
| `VITE_AUTH_ENABLED` | `false` |

`DATABASE_URL` нужна и для сборки (миграции), и для рантайма.

4. Deploy.
5. В @BotFather укажите HTTPS-домен Mini App.
6. Откройте Mini App один раз — вебхук `/api/telegram/webhook` регистрируется сам.

Бот: [@thelumibeautybot](https://t.me/thelumibeautybot)

`/start` отправляет фото студии и кнопку **Записаться**. Новая запись уходит админу в Telegram и сохраняется в Postgres, даже если сообщение не дошло.

## Не коммитить

Файл `.env` с токеном в GitHub не кладите. В архиве его нет.
