import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Automatski dodaje Bearer token iz cookie-ja na svaki zahtjev
api.interceptors.request.use((config) => {
  if (typeof document !== "undefined") {
    const token = getTokenFromCookie();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

function getTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|; )mg_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default api;
