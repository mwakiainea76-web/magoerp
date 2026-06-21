import axios from "axios";

import { useAuthStore } from "@/store/authStore";

export const AUTH_API_BASE_URL =
  import.meta.env.VITE_AUTH_API_URL ?? import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

export const AUTH_API_RETRY_COUNT = Number.parseInt(import.meta.env.VITE_AUTH_API_RETRIES ?? "2", 10);
export const AUTH_API_RETRY_DELAY_MS = Number.parseInt(
  import.meta.env.VITE_AUTH_API_RETRY_DELAY_MS ?? "500",
  10,
);

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function shouldRetry(error) {
  if (!error) {
    return false;
  }

  if (error.code === "ECONNABORTED") {
    return true;
  }

  if (!error.response) {
    return true;
  }

  return error.response.status >= 500;
}

function logApiError(error) {
  if (typeof console === "undefined") {
    return;
  }

  if (import.meta.env.DEV) {
    console.error("API error", error);
    return;
  }

  console.error("API error", {
    status: error?.response?.status ?? null,
    url: error?.config?.url ?? null,
    method: error?.config?.method ?? null,
  });
}

export const authClient = axios.create({
  baseURL: AUTH_API_BASE_URL,
  timeout: 10000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

authClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

authClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (!config || !shouldRetry(error)) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount ?? 0;

    if (config.__retryCount >= AUTH_API_RETRY_COUNT) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;
    await delay(AUTH_API_RETRY_DELAY_MS);

    return authClient(config);
  },
);

export function getApiErrorMessage(error, fallbackMessage = "Something went wrong.") {
  logApiError(error);

  if (!error?.response) {
    return fallbackMessage;
  }

  if (error.response.status >= 500) {
    return fallbackMessage;
  }

  const responseMessage = error.response.data?.message;

  if (typeof responseMessage === "string" && responseMessage.trim() !== "") {
    return responseMessage;
  }

  return fallbackMessage;
}
