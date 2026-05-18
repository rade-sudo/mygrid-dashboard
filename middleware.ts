import { NextRequest, NextResponse } from "next/server";

// Prefiks ruta kojima svaka uloga ima pristup
const ROLE_ROUTES: Record<string, string[]> = {
  vlasnik:              ["/dashboard"],
  administrator:        ["/dashboard/administracija"],
  "menadzer-finansija": ["/dashboard/finansije"],
  "menadzer-gradilista":["/dashboard/gradiliste"],
};

// Početna stranica po ulozi
const ROLE_HOME: Record<string, string> = {
  vlasnik:              "/dashboard",
  administrator:        "/dashboard/administracija",
  "menadzer-finansija": "/dashboard/finansije",
  "menadzer-gradilista":"/dashboard/gradiliste",
};

function isAllowed(role: string, pathname: string): boolean {
  const allowed = ROLE_ROUTES[role] ?? ["/dashboard"];
  return allowed.some((prefix) => pathname.startsWith(prefix));
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get("mg_token")?.value;
  const role  = request.cookies.get("mg_role")?.value ?? "";
  const { pathname } = request.nextUrl;

  // Korijen → redirekcija na home ili login
  if (pathname === "/") {
    const home = token ? (ROLE_HOME[role] ?? "/dashboard") : "/login";
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Zaštićene rute — bez tokena idi na login
  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Ako je već ulogovan a posjeti login, idi na home
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/dashboard", request.url));
  }

  // RBAC: provjeri da li uloga ima pristup traženoj ruti
  if (token && role && pathname.startsWith("/dashboard")) {
    if (!isAllowed(role, pathname)) {
      const home = ROLE_HOME[role] ?? "/dashboard";
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*", "/login"],
};
