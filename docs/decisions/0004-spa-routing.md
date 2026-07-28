# ADR 0004: SPA Routing Strategy

**Status**: Accepted  
**Date**: 2026-07-28  
**Author**: System Audit

---

## Context

The frontend is a single-page application with complex routing requirements:
- Public routes (login, password reset)
- Protected routes (admin, staff, student dashboards)
- Role-based access control at the route level
- Auth state must persist across page refreshes

---

## Decision

Use React Router v6 with a centralized route configuration file, a `RequireAuth` guard component, and Zustand for auth state persistence.

### Route Structure

All routes are defined in a single file: `frontend/src/router/index.jsx`

```jsx
const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'reset-password/:token', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <AdminDashboardPage /> },
          { path: 'students', element: <StudentsPage /> },
          // ... all protected routes
        ],
      },
    ],
  },
]);
```

### RequireAuth Guard

```jsx
function RequireAuth({ roles }) {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
```

Key behaviors:
- **Null guard**: `user` can be null during Zustand's hydration from localStorage — the component checks `!user` explicitly before redirecting to prevent premature navigation.
- **Loading state**: Shows a skeleton/spinner while auth state is being hydrated.
- **Role filtering**: Optional `roles` prop restricts route access by user role.

### State Persistence

Zustand's `persist` middleware saves auth state to `localStorage`:

```js
const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      clearAuth: () => set({ user: null, token: null }),
    }),
    { name: 'auth-storage' }
  )
);
```

---

## Rationale

1. **Single source of truth** — All routes in one file makes auditing and reordering straightforward.
2. **Guard composability** — `RequireAuth` can be stacked or wrapped for nested protection.
3. **localStorage persistence** — Survives tab closes and browser restarts without server round-trips.
4. **Zustand** — Minimal boilerplate, no provider wrapping needed, works well with React Router.

---

## Consequences

**Positive:**
- Clear separation between auth logic and route definitions
- Role-based access is declarative and easy to audit
- Fast page loads after initial auth hydration

**Negative:**
- localStorage is accessible to XSS — auth tokens could be exfiltrated (mitigated by HttpOnly cookies as alternative)
- Race condition during hydration requires the null guard workaround
- Role checks happen client-side and must be re-validated server-side

---

## Alternatives Considered

1. **Per-page auth checks** — More flexible but leads to duplicated guard logic across pages.
2. **Higher-order component guards** — Less composable than the `<Outlet>` pattern.
3. **Context-based auth** — More boilerplate than Zustand, no built-in persistence.
