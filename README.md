# Lumi

Telegram Mini App записи в студию красоты Lumi.

Клиент выбирает направление, услугу, мастера и время. Админ — Telegram ID `743736933`.

## Стек

- TanStack Start + React + Vite
- Tailwind CSS
- Postgres (Neon в проде, PGLite локально)
- Telegram Bot API

## Локально

```bash
npm install
cp .env.example .env
# впишите TELEGRAM_BOT_TOKEN
npm run dev
```

Откроется http://localhost:8080/

## Vercel

1. Залейте этот репозиторий на GitHub.
2. Import в [Vercel](https://vercel.com/new).
3. Environment Variables:

| Name | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | токен бота |
| `DATABASE_URL` | строка Neon Postgres |
| `VITE_AUTH_ENABLED` | `false` |

4. Deploy.
5. В @BotFather укажите домен Mini App (HTTPS URL деплоя).
6. Откройте Mini App один раз — вебхук `/api/telegram/webhook` регистрируется сам.

Бот: [@thelumibeautybot](https://t.me/thelumibeautybot)

`/start` отправляет фото студии и кнопку **Записаться**. Новая запись уходит админу в Telegram и сохраняется в базе, даже если сообщение не дошло.

## Не коммитить

Файл `.env` с токеном в GitHub не кладите. В архиве его нет.
