import { create } from "zustand";

const AUTH_STORAGE_KEY = "magoerp.auth";

function readStoredAuth() {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!raw) {
      return { token: null, user: null };
    }

    const parsed = JSON.parse(raw);

    return {
      token: parsed?.token ?? null,
      user: parsed?.user ?? null,
    };
  } catch {
    return { token: null, user: null };
  }
}

function writeStoredAuth(token, user) {
  if (typeof window === "undefined") {
    return;
  }

  if (!token) {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      token,
      user,
    }),
  );
}

const initialAuth = readStoredAuth();

export const useAuthStore = create((set) => ({
  token: initialAuth.token,
  user: initialAuth.user,
  setAuth: ({ token, user }) => {
    writeStoredAuth(token, user);
    set({ token, user });
  },
  clearAuth: () => {
    writeStoredAuth(null, null);
    set({ token: null, user: null });
  },
}));
