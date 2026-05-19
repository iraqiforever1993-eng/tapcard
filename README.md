# TapCard

A free digital business card platform. Users create a profile, get a unique public URL, and program that URL onto any NFC tag. When someone taps the tag, the profile opens and one tap saves the contact via vCard.

## Stack

- React + Vite + Tailwind + shadcn/ui (wouter hash router)
- Express + better-sqlite3 + Drizzle
- bcryptjs for passwords, random-token sessions in DB
- `qrcode` for QR generation client-side

## Pages

- `/` Landing
- `/signup`, `/login`
- `/dashboard` Card editor (auth)
- `/c/:slug` Public card

## API

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET  /api/me` (auth)
- `PATCH /api/cards/me` (auth)
- `GET  /api/cards/by-slug/:slug`
- `GET  /api/cards/:slug/vcard` — returns `text/vcard`

## Sessions

Tokens are kept in React context (no localStorage — it's blocked in the sandbox iframe), so **sessions don't survive a page refresh in this demo**. In production this would switch to httpOnly cookies.

## Run

```
npm install
npm run dev
```

For production:
```
npm run build
NODE_ENV=production node dist/index.cjs
```
