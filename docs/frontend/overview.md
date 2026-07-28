# Frontend Overview

The frontend is a React (Vite) SPA with 2810+ modules. It follows a feature-based organization with shared components, hooks, and utilities.

---

## Tech Stack

- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **State Management**: Zustand (auth, UI state) + React Query (server state)
- **HTTP Client**: Axios
- **UI Library**: Custom components with Tailwind CSS

---

## Directory Structure

```
frontend/src/
  components/       # Shared/reusable components
  views/            # Page components (one per route)
  router/           # Route definitions + guards
  store/            # Zustand stores (auth, app)
  hooks/            # Custom React hooks (useApi, useToast, etc.)
  utils/            # Utility functions (formatters, validators)
  api/              # API client configuration
  layouts/          # Layout components (AppLayout, AuthLayout)
  assets/           # Static assets (images, fonts)
```

---

## Component Patterns

### Page Components
- One file per route, named as `{Feature}Page.jsx`
- Use `useApi` hook for data fetching
- Handle loading, error, and empty states
- Toast notifications for success/error feedback

### Form Components
- Named as `{Feature}FormPage.jsx`
- Use controlled inputs with `useState`
- Validate with custom validation or backend 422 responses
- Submit via Axios with try/catch and toast feedback

### Reusable Components
- `DataTable` — paginated table with search, sort, and actions
- `FormField` — input wrapper with label, error, and help text
- `StatusBadge` — colored badge for status values
- `Modal` — overlay dialog for create/edit flows
- `ConfirmDialog` — confirmation before destructive actions

---

## Routing

Routes are defined in `frontend/src/router/index.jsx`. Protected routes use the `RequireAuth` guard component.

### Guard: RequireAuth

```jsx
<Route element={<RequireAuth roles={['admin', 'lecturer']} />}>
  <Route path="/students" element={<StudentsPage />} />
</Route>
```

Key behavior:
- Reads auth state from Zustand store (persisted to localStorage)
- Shows loading skeleton during hydration
- Redirects to `/login` if user is not authenticated
- Null-checks `user` before redirect to prevent premature redirect during store initialization

### Available Guards
- `RequireAuth` — requires authentication with optional role filter
- `RequireGuest` — redirects authenticated users away from login/register

---

## State Management

### Zustand Auth Store

```js
const useAuthStore = create(persist(
  (set) => ({
    user: null,
    token: null,
    setAuth: (user, token) => set({ user, token }),
    clearAuth: () => set({ user: null, token: null }),
  }),
  { name: 'auth-storage' }
));
```

Persisted to localStorage under key `auth-storage`.

### React Query

Server state (API data) is managed by React Query with automatic caching, refetching, and invalidation.

---

## API Communication

### useApi Hook

```js
const { data, loading, error, execute } = useApi('/api/students', {
  method: 'GET',
  params: { page: 1 }
});
```

- Wraps Axios with base URL and auth token injection
- Interceptors handle 401 responses (auto-logout)
- Error handling extracts messages via `getApiErrorMessage`

### Error Handling Utility

```js
import { getApiErrorMessage } from '../../utils/formatters';
```

Extracts the most relevant error message from API error responses (422, 500, network errors).

---

## Environment Variables

```
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=Mago ERP
```

Vite prefixes `VITE_` to expose env vars to client code.
