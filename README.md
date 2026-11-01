# Tio de Pet

## Teste local MyGroomer

Com a API do workspace já iniciada em `http://localhost:3000` no modo local e o seed aplicado:

```powershell
npm ci
Copy-Item .env.example .env
npm run web -- --localhost --port 8081
```

Abra `http://localhost:8081`. A configuração de exemplo aponta REST e Socket.io para esta máquina. Contas fictícias: `tutor@email.com` e `groomer@email.com`, ambas com senha `admin`.

O aviso de teste é exibido a partir da configuração da API. Nesse modo, reservas não abrem checkout, cadastro dispensa e-mail real e Google fica oculto. Use apenas dados fictícios. O nome exibido fica em `constants/brand.ts`. Valores herdados do marketplace anterior ainda não representam políticas financeiras deste produto.

`localhost` no celular representa o próprio aparelho; para acesso físico é necessário configurar URLs alcançáveis e a interface de escuta da API. A validação deste lote cobre navegador e exportações de bundle Android/iOS, sem equivaler a teste em dispositivo.

Checagem de tipos: `node node_modules/typescript/bin/tsc --noEmit`. Builds exportados ficam em `dist-*`, ignorados pelo Git e excluídos da checagem de fontes.

Aplicativo React Native (Expo) do **Tio de Pet**. Tutores encontram profissionais de pet para atendimento em domicílio no Brasil. O nome e o esquema de link ficam em `constants/brand.ts` (`EXPO_PUBLIC_APP_NAME`, `EXPO_PUBLIC_APP_SCHEME`). A API correspondente está em [MyGroomerApi](https://github.com/adminorcode/MyGroomerApi). O repositório deste aplicativo continua [MyGroomerApp](https://github.com/adminorcode/MyGroomerApp).

---

## What it does

Customers browse services, pick a provider, book and pay via Mobile Money or card (Paystack), then track the job and chat in realtime. Providers manage bookings, offer services, view earnings, and message customers. Role-based navigation switches the entire shell between customer and provider experiences after login.

---

## Screenshots

### Auth

| Login | Register |
|:-----:|:--------:|
| ![Login](demo/login_screen.jpeg) | ![Register](demo/register_screen.jpeg) |

### Customer

| Home | Bookings | Booking detail |
|:----:|:--------:|:--------------:|
| ![Customer home](demo/customer_home_screen.jpeg) | ![Customer bookings](demo/customer_bookings_screen.jpeg) | ![Booking detail](demo/booking_detail.jpeg) |

| Chat | Profile | Leave a review |
|:----:|:-------:|:--------------:|
| ![Chat](demo/chat_screen.jpeg) | ![Customer profile](demo/customer_profile_screen.jpeg) | ![Review completed service](demo/review_completed_service.jpeg) |

| View review |
|:-----------:|
| ![View review](demo/view_review.jpeg) |

### Provider

| Dashboard | My services | Add service |
|:---------:|:-----------:|:-----------:|
| ![Provider home](demo/provider_home_screen.jpeg) | ![Provider services](demo/provider_services_screen.jpeg) | ![Add new service](demo/add_new_service.jpeg) |

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Expo SDK 56 + React Native | Fast iteration, EAS builds, native modules when needed |
| Language | TypeScript | Shared types with the API domain model |
| Navigation | React Navigation 7 | Stack + bottom tabs, deep linking (`tiodepet://`, configurável) |
| Server state | TanStack Query | Caching, mutations, and loading/error UX for API calls |
| Client state | Zustand + AsyncStorage | Persisted auth session |
| Forms | React Hook Form + Zod | Schema-first validation aligned with the API |
| HTTP | Axios | JWT attach + global 401 logout |
| Realtime | Socket.io client | Chat and unread message sync |
| Auth extras | expo-auth-session + expo-web-browser | Google OAuth and Paystack checkout |
| UI | Custom theme + Lucide icons | Brand fonts (Abres no logotipo, Inter na interface), tema claro |

---

## App Architecture

```
App.tsx
├── ThemeProvider
├── QueryClientProvider
├── SocketProvider          ← connects when JWT is present
└── RootNavigator
    ├── Auth (no token)
    ├── Customer tabs (role !== provider)
    └── Provider tabs (role === provider)
```

```
UI → hooks (TanStack Query) → services (Axios) → API do Tio de Pet
                ↓
         SocketContext → Socket.io (chat / unread)
                ↓
         Zustand stores (auth, unread)
```

---

## Features

### Authentication
- Email/password register → email verification → login
- Google Sign-In via Expo Auth Session
- JWT stored in Zustand, persisted with AsyncStorage
- Automatic `Authorization` header on every request
- Global logout on `401` responses
- Deep links for auth screens (`tiodepet://login`, `register`, `verify-email`; o esquema vem de `APP_SCHEME`)

### Customer experience
- Home: categories and services catalogue
- Provider listing per service, then book with date/time and location
- Paystack checkout opened in an in-app browser session
- Bookings list with status filters and detail screens
- Leave reviews after completed jobs
- Realtime chat with providers
- Profile + **Become a Provider** onboarding

### Provider experience
- Dashboard for incoming and active bookings (confirm / start / complete / cancel)
- Manage offered services (add, edit, pricing)
- Earnings / transaction history
- Shared messages stack with unread badge
- Profile (hidden tab, opened from header)

### Realtime messaging
- Socket authenticated with JWT on connect
- Conversation list + chat thread UI
- Unread badge on the Messages tab (Zustand + conversation sync)

### Theming
- Light and dark palettes in `constants/theme.ts`
- Custom fonts loaded before splash hide
- Status bar follows theme

---

## Navigation Map

| Role | Tabs |
|------|------|
| **Customer** | Home · Bookings · Messages · (Profile hidden) |
| **Provider** | Dashboard · Services · Earnings · Messages · (Profile hidden) |

Stack navigators nest under tabs for detail flows (booking detail, chat, book service, add/edit service, reviews, become a provider, etc.).

---

## Project Structure

```
client/
├── App.tsx                 — providers, fonts, splash
├── app.json / eas.json     — Expo config + EAS build profiles
├── assets/                 — icons, splash, fonts
├── components/
│   ├── chat/               — bubble, input, header, date separator
│   └── shared/             — buttons, inputs, cards, badges, headers
├── constants/              — API URLs, theme tokens
├── context/                — ThemeContext, SocketContext
├── hooks/                  — React Query hooks (auth, bookings, chat, …)
├── navigation/             — root, auth, customer, provider, stacks
├── screens/
│   ├── auth/
│   ├── customer/
│   └── provider/
├── services/               — Axios API modules
├── store/                  — authStore, unreadStore
├── types/                  — shared TypeScript models
├── utils/                  — JWT parse, dates, greeting
└── validators/             — Zod schemas for forms
```

---

## Running Locally

### Prerequisites
- Node.js 18+
- Expo Go **or** a development build (`expo-dev-client` is in the project)
- API do Tio de Pet em execução numa máquina alcançável pelo celular ou emulador
- For physical devices: use your LAN IP (not `localhost`) in `.env`

### Setup

```bash
cd client
npm install

cp .env.example .env
# set YOUR_LAN_IP so a physical device can reach the API

npx expo start
```

Then press `a` / `i` for Android / iOS simulator, or scan the QR code with Expo Go / your dev client.

Native scripts (when using a prebuild / local Android folder):

```bash
npm run android
npm run ios
```

### Environment Variables

Create a `.env` in `client/` (gitignored):

```env
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000/api/v1
EXPO_PUBLIC_SOCKET_URL=http://YOUR_LAN_IP:3000
EXPO_PUBLIC_APP_NAME=Tio de Pet
EXPO_PUBLIC_APP_SCHEME=tiodepet
```

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | REST base URL (must include `/api/v1`) |
| `EXPO_PUBLIC_SOCKET_URL` | Socket.io origin (no `/api` path) |
| `EXPO_PUBLIC_APP_NAME` | Nome público. Padrão: Tio de Pet |
| `EXPO_PUBLIC_APP_SCHEME` | Esquema de deep link. Padrão: `tiodepet`. A API precisa do mesmo valor em `APP_SCHEME` |

Restart Expo after changing env vars so Metro picks them up.

### EAS builds

Profiles in `eas.json`:

- **development** — internal distribution, development client
- **preview** — internal distribution
- **production** — auto-increment version

```bash
npx eas build --profile development --platform android
```

---

## Key Integrations

| Concern | How the client handles it |
|---------|---------------------------|
| API auth | Axios interceptor + persisted JWT |
| Google OAuth | `expo-auth-session` → backend token → store |
| Payments | Booking flow opens Paystack URL via `expo-web-browser` |
| Chat | `SocketProvider` + conversation/message services |
| Location | Text-based location on bookings (map picker planned) |
| Deep linking | Esquema em `constants/brand.ts`, aplicado por `app.config.ts` |

---

## Engineering Highlights

**Payment verification via webhook, not redirect.** Paystack redirects after
checkout can't reliably reach a mobile app's custom scheme, so the client
doesn't trust the redirect. After the in-app browser closes, it polls the
booking status — which the backend flips only after verifying Paystack's
server-to-server webhook. The webhook is the source of truth; the client
confirms against it.

**Cursor-based pagination for chat.** Message history loads newest-first in
fixed pages using a compound cursor (created_at + id) rather than OFFSET,
which avoids duplicated/skipped messages when new messages arrive mid-scroll.
Live socket messages merge with the paginated history, deduplicated by id.

**Realtime + paginated history, reconciled.** The chat screen derives its
message list from two sources — an infinite query (server history) and live
socket state — merged and deduped, so pagination and live delivery coexist
without overwriting each other.

**Role-based app shell.** Registering as a provider issues a new JWT with the
updated role; the root navigator switches the entire tab structure reactively
when the token changes — no manual navigation.

## Planned / related

- Map-based location picker (react-native-maps + geocoding) — coordinate
  columns and location libraries are already in place; pin-drop UI pending

Backend-planned features that will land in this client over time:

- Push notifications (Expo / FCM)
- Cloudinary image uploads (provider profile / ID)
- Dispute flows
- Apple Sign-In

---

*Aplicativo Tio de Pet. O workspace e os repositórios continuam com o nome MyGroomer.*
