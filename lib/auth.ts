const TOKEN_KEY = "mg_token";
const ROLE_KEY  = "mg_role";
const MAX_AGE   = 60 * 60 * 24 * 7; // 7 dana

export function setToken(token: string): void {
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )mg_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeToken(): void {
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

export function setRole(role: string): void {
  document.cookie = `${ROLE_KEY}=${encodeURIComponent(role)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function getRole(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )mg_role=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function removeRole(): void {
  document.cookie = `${ROLE_KEY}=; path=/; max-age=0`;
}
