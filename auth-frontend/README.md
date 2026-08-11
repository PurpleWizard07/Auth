# auth-frontend

React + TypeScript frontend for the auth-starter project. Provides login, registration, password reset, and profile screens backed by the `auth-backend` FastAPI service.

---

## Tech stack

| Tool | Version |
|---|---|
| React | 18 |
| TypeScript | 5 |
| Vite | 5 |
| React Router | 6 |
| Vitest | 2 |
| Testing Library | 16 |

---

## Prerequisites

- Node.js 20+
- The `auth-backend` service running (see `../auth-backend/README.md`)

---

## Setup

1. **Clone the repository and enter the frontend directory**

   ```bash
   cd auth-frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Copy the example file and edit as needed:

   ```bash
   cp .env.example .env
   ```

   See the [Environment variables](#environment-variables) section below for a description of each variable.

4. **Start the development server**

   ```bash
   npm run dev
   ```

   The app is served at `http://localhost:5173` by default. API requests to `/api/v1/*` are proxied to `http://localhost:8000` (configurable in `vite.config.ts`).

---

## Available scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | Run ESLint across `src/` |

---

## Environment variables

All variables consumed by the frontend must be prefixed with `VITE_` so that Vite includes them in the client bundle. Variables without this prefix are ignored.

Create a `.env` file in `auth-frontend/` (never commit it). Use `.env.example` as the template.

### `VITE_API_BASE_URL`

| Field | Value |
|---|---|
| **Required** | Yes |
| **Default (example)** | `http://localhost:8000` |
| **Description** | Base URL of the running `auth-backend` instance. The Vite dev-server proxy forwards `/api/v1` requests to this origin, so during development you can leave the value pointing at `localhost`. In production builds, set this to the fully-qualified HTTPS URL of your deployed backend (e.g. `https://api.example.com`). |

---

## Project structure

```
auth-frontend/
├── index.html                   # HTML entry point
├── vite.config.ts               # Vite + dev-proxy configuration
├── tsconfig.json                # TypeScript compiler options
├── .env.example                 # Environment variable template
└── src/
    ├── main.tsx                 # React app bootstrap
    ├── api/
    │   └── auth.ts              # Typed API client (login, register, me, …)
    ├── features/
    │   └── auth/
    │       └── pages/
    │           ├── LoginPage.tsx
    │           ├── RegisterPage.tsx
    │           ├── ForgotPasswordPage.tsx
    │           └── ResetPasswordPage.tsx
    └── pages/
        └── ProfilePage.tsx
```

---

## API client

The file `src/api/auth.ts` exposes one typed function per backend endpoint:

| Function | Method | Path |
|---|---|---|
| `login` | POST | `/auth/login` |
| `register` | POST | `/auth/register` |
| `forgotPassword` | POST | `/auth/forgot-password` |
| `resetPassword` | POST | `/auth/reset-password` |
| `me` | GET | `/auth/me` |
| `logout` | POST | `/auth/logout` |
| `refresh` | POST | `/auth/refresh` |

All functions use `VITE_API_BASE_URL` as the base and throw a typed error object on non-2xx responses.

---

## Auth state

Global authentication state is managed by `AuthContext` (see `src/context/AuthContext.tsx`) and exposed via the `useAuth` hook. The context provides:

```ts
{ user, isAuthenticated, isLoading, login, register, logout, refresh }
```

Route guards are implemented as wrapper components:

- `<RequireAuth>` — redirects unauthenticated users to `/login`.
- `<RequireGuest>` — redirects already-authenticated users to `/profile`.

---

## Styling

All visual values (colors, spacing, radii, typography) are sourced from CSS custom properties defined as design tokens. No hard-coded style values appear in components. Class names follow a BEM-like convention (`.auth-card`, `.auth-card__field`, `.field--error`).

---

## Running with Docker Compose

To start both the frontend and backend together, use the root-level Compose file:

```bash
docker-compose up --build
```

See `../README.md` for full stack setup instructions.

---

## License

MIT
