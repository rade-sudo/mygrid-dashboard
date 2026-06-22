export const NAV_ROUTES: Record<string, string> = {
  dash: "/dashboard",
  fin:  "/dashboard/finansije",
  pro:  "/dashboard/prodaja",
  grad: "/dashboard/gradiliste",
  adm:  "/dashboard/administracija",
  obv:  "/dashboard/obavjestenja",
  izv:  "/dashboard/izvestaji",
};

export function getNavRoute(id: string): string {
  return NAV_ROUTES[id] ?? "/dashboard";
}
