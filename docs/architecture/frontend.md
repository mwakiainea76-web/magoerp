# Frontend Architecture

## Framework

**React 18** with **Vite** as the build tool. The application is a single-page application (SPA) with client-side routing.

| Package | Purpose |
|---|---|
| `react-router-dom` v6 | Client-side routing with lazy loading |
| `@hookform/resolvers` | Yup schema validation for forms |
| `react-hook-form` | Form state management |
| `react-hot-toast` | Toast notifications |
| `zustand` | Global state management (auth store) |
| `recharts` | Chart library (dashboard) |
| `lucide-react` | Icon library |
| `yup` | Schema validation |
| `axios` | HTTP client (via authClient wrapper) |

---

## Directory Structure

```
frontend/src/
├── App.jsx                        # Root component — lazy-loads role routes
├── main.jsx                       # Entry point — BrowserRouter + Toaster
├── index.css                      # Tailwind v4 base styles
├── components/
│   ├── dashboard/
│   │   └── RoleDashboard.jsx      # Shared role-based dashboard
│   ├── finance/                   # Finance-specific components
│   ├── DataTable.jsx              # Generic sortable/filterable table
│   ├── FilterPanel.jsx            # Reusable filter UI
│   ├── FormButton.jsx             # Styled button with loading state
│   ├── FormInput.jsx              # Styled input with label + error
│   ├── LookupSelect.jsx           # Debounced search autocomplete
│   ├── Modal.jsx                  # Reusable modal dialog
│   ├── ModuleNav.jsx              # Module tab navigation
│   ├── Navbar.jsx                 # Top navigation bar
│   ├── PaginationFooter.jsx       # Pagination controls
│   ├── SearchSelect.jsx           # Searchable select dropdown
│   ├── Sidebar.jsx                # Sidebar navigation
│   ├── SidebarNavItem.jsx         # Sidebar nav link item
│   ├── StatusBadge.jsx            # Color-coded status badge
│   └── StudentAccountCard.jsx     # Student account summary card
├── hooks/                         # 46 custom API hooks
├── layouts/
│   ├── AppLayout.jsx              # Authenticated layout (sidebar + navbar + content)
│   └── AuthLayout.jsx             # Public layout (centered auth forms)
├── lib/
│   ├── api/
│   │   └── authClient.js          # Axios instance with interceptors
│   └── styles.js                  # Shared style class constants
├── pages/                         # 25+ page directories (~60 pages)
├── router/
│   ├── index.jsx                  # Route group re-exports
│   ├── RequireAuth.jsx            # Auth guard component
│   ├── RequireRole.jsx            # Role guard component
│   └── routes/
│       ├── admin.routes.jsx       # ~50 admin routes
│       ├── finance.routes.jsx     # 15 finance routes
│       ├── trainer.routes.jsx     # 3 trainer routes
│       ├── student.routes.jsx     # 10 student routes
│       ├── security.routes.jsx    # 9 security routes
│       └── shared.routes.jsx      # 2 shared routes
├── store/
│   └── authStore.js               # Zustand auth store
└── support/
    ├── dashboardPaths.js          # Role → dashboard URL mapping
    └── navigation/
        ├── index.js               # Re-exports
        ├── moduleNavConfigs.js    # Module tab configuration
        └── permissioned.nav.js    # Sidebar navigation tree
```

---

## Build Configuration

**Build tool**: Vite with `@vitejs/plugin-react`

```
Build size: 2810 modules
Build time: ~15s (production)
Dev server: Vite dev server with HMR
```

**Environment variables** (in `.env`):

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_URL` | Backend API base URL | `http://127.0.0.1:8000/api` |
| `VITE_AUTH_API_URL` | Auth API base URL (falls back to `VITE_API_URL`) | — |
| `VITE_AUTH_API_RETRIES` | Axios retry count on network errors | `0` |

---

## Routing Architecture

### Route Loading Strategy

Routes are **lazy-loaded per role** to minimize initial bundle size:

```jsx
// App.jsx
const ROUTE_LOADERS_BY_ROLE = {
  admin: () => import("@/router/routes/admin.routes"),
  finance: () => import("@/router/routes/finance.routes"),
  trainer: () => import("@/router/routes/trainer.routes"),
  student: () => import("@/router/routes/student.routes"),
};
```

The `useRoleRoutes` hook dynamically loads the route bundle when the user's role is known, using `React.lazy` + `Suspense` for chunk loading.

### Route Hierarchy

```
<BrowserRouter>
  <Routes>
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<LoginPage />} />
    </Route>

    <Route element={<RequireAuth />}>       ← checks auth + password reset
      <Route element={<AppLayout />}>       ← sidebar, navbar, module nav
        {SharedRoutes}                      ← /reset-password, /forbidden
        {roleRoutes}                        ← admin|finance|trainer|student routes
        <Route path="*" element={<ForbiddenPage />} />
      </Route>
    </Route>

    <Route path="*" element={<Navigate to="/login" />} />
  </Routes>
</BrowserRouter>
```

---

## State Management

### Zustand Auth Store

```js
const useAuthStore = create(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setAuth: ({ token, user }) => set({ token, user }),
      updateUser: (user) => set({ user }),
      clearAuth: () => set({ token: null, user: null }),

      can: (permission) => {
        const user = get().user;
        return user?.permissions?.includes(permission) ?? false;
      },
    }),
    {
      name: "magoerp.auth",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

**Hydration note**: On page load, Zustand `persist` middleware reads `localStorage` synchronously. However, `token` may be present while `user` is still being deserialized. `RequireAuth` guards against this with a `!user → return null` check.

---

## API Integration

### authClient (Axios Instance)

```js
const authClient = axios.create({
  baseURL: import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  headers: { Accept: "application/json" },
  withCredentials: true,
});
```

**Request interceptor**: Attaches `Authorization: Bearer {token}` from `useAuthStore.getState().token`.

**Response interceptor**: On `401`, calls `clearAuth()` and redirects to `/login`. On network errors, retries up to `VITE_AUTH_API_RETRIES` times.

### API Hook Pattern

Every domain has a dedicated hook wrapping `authClient` calls:

```js
// hooks/useStudentsApi.js
export function useStudentsApi() {
  return useMemo(() => ({
    list: (params) => authClient.get("/students", { params }),
    show: (id) => authClient.get(`/students/${id}`),
    create: (payload) => authClient.post("/students", payload),
    update: (id, payload) => authClient.put(`/students/${id}`, payload),
    remove: (id) => authClient.delete(`/students/${id}`),
    meta: (params) => authClient.get("/students/meta", { params }),
    exportStudents: (params) => authClient.get("/students/export", { params }),
  }), []);
}
```

---

## Component Patterns

### Page Component Pattern

```jsx
export function StudentsPage() {
  // 1. State declarations
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 2. API hook
  const api = useStudentsApi();

  // 3. Data fetching effect
  useEffect(() => { ... }, [page, query]);

  // 4. Callback handlers
  const handleDelete = useCallback(async (student) => { ... }, [api]);

  // 5. Render
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorBanner />;

  return (
    <section>
      {/* filters */}
      {/* table */}
      {/* pagination */}
    </section>
  );
}
```

### Form Page Pattern

```jsx
export function StudentFormPage() {
  const { studentId } = useParams();
  const isEdit = Boolean(studentId);

  // 1. React Hook Form
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(studentSchema),
  });

  // 2. Load existing data
  useEffect(() => {
    if (isEdit) api.show(studentId).then(res => reset(res.data));
  }, [studentId]);

  // 3. Submit handler
  const onSubmit = async (data) => {
    try {
      if (isEdit) await api.update(studentId, data);
      else await api.create(data);
      toast.success("Saved.");
    } catch (e) { ... }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormInput label="Name" {...register("name")} />
      <FormButton type="submit">Save</FormButton>
    </form>
  );
}
```

---

## Styling

**Tailwind CSS v4** with the following conventions:

- File: `index.css` imports Tailwind and custom font (Plus Jakarta Sans)
- Components use utility classes directly (no CSS modules, no styled-components)
- Shared class constants in `lib/styles.js`:
  - `bodyTextClassName` — standard body text
  - `labelClassName` — form label text
  - `inputClassName` — text input styling
  - `selectClassName` — select dropdown styling
  - `textAreaClassName` — textarea styling
  - `initialMeta` — default pagination meta object

---

## Error Handling Patterns

### API Errors

```js
catch (e) {
  const serverErrors = e?.response?.data?.errors;
  if (serverErrors) {
    // Map server validation errors to form fields
    Object.entries(serverErrors).forEach(([key, value]) => {
      setError(key, { message: value?.[0] ?? "Invalid value" });
    });
  } else {
    setError("root", { message: getApiErrorMessage(e, "Operation failed.") });
  }
}
```

### Loading States

- Data tables: skeleton/spinner during initial load
- Forms: `isSubmitting` disables submit button
- Save operations: loading spinner on button + toast on success/error

### Empty States

- Tables: "No records found" message
- Filters: "No results match your search"
- Student dashboard: informative messages when data is unavailable
