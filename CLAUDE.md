# mygrid-dashboard — projekt brief

## Šta je ovo

**mygrid** je interni poslovni dashboard za upravljanje firmom.  
Frontend: **Next.js 16.2.6** (App Router, TypeScript).  
Backend: **Laravel REST API** — još nije implementiran, planira se u sledećoj fazi.  
Dev server: `npm run dev` → `http://localhost:3000`

Dizajn referenca: `c:\Users\Korisnik\Desktop\test\Mygrid Dashboard.html`  
Funkcionalnost referenca: `c:\Users\Korisnik\Desktop\test\koloseum_sistem__46_ (1).html`

---

## Moduli

| Modul | Status |
|---|---|
| Dashboard (početna, kartice) | Implementiran |
| Obaveštenja (slanje, istorija) | Implementiran |
| Finansije | Nije implementirano |
| Prodaja | Nije implementirano |
| Gradilište | Nije implementirano |
| Administracija | Nije implementirano |
| Pumpa | Preskočiti — ne implementirati |
| Vozila | Preskočiti — ne implementirati |
| Magacin | Preskočiti — ne implementirati |

---

## Dizajn sistem

### Pravila stila
- Sve komponente koriste **React inline styles** — bez Tailwind klasa (Tailwind je instaliran ali se ne koristi u JSX-u).
- Font: **Inter** (učitan preko `next/font/google`, weights 400–800).
- Locale: `sr-Latn` za datume i vremena.
- Inline stil uvek koristi CSS custom properties gdje postoje (`var(--brand)`, `var(--border)`...).

### CSS custom properties (`app/globals.css`)

```
--bg: #ffffff
--sidebar-bg: #fafafa
--border: #ececec
--border-soft: #f1f1f1
--text: #111418
--text-2: #4b5563
--muted: #8a8f98
--muted-2: #b6bac1
--brand: #2563eb          (plava — Prodaja, generalno)
--brand-soft: #eaf1ff
--brand-ink: #0a1b3d
--green: #16a34a          (Finansije)
--green-soft: #e8f6ee
--amber: #d97706          (Gradilište)
--amber-soft: #fdf3e3
--red: #dc2626            (hitno, greška)
--violet: #7c3aed         (Administracija, obaveštenja)
--violet-soft: #f1ebff
--shadow-card: 0 1px 2px rgba(16,24,40,.04), 0 1px 1px rgba(16,24,40,.02)
```

### Boje po sektoru

| Sektor | Boja | Hex |
|---|---|---|
| Finansije | green | `#16a34a` |
| Prodaja | brand/blue | `#2563eb` |
| Gradilište | amber | `#d97706` |
| Administracija | violet | `#7c3aed` |
| Svi sektori | brand/blue | `#2563eb` |

---

## Struktura fajlova

```
app/
  globals.css          — CSS custom properties, reset, scrollbar
  layout.tsx           — Inter font, lang="sr", body font-family
  page.tsx             — jedini route, renderuje <DashboardPage>

components/
  ui/
    icons.tsx          — svi SVG ikoni (inline, stroke="currentColor", props: w, h)

  layout/
    Sidebar.tsx        — 260px fixed sidebar, nav stavke, brzi kontakti, user card
    TopBar.tsx         — datum pill (sr-Latn), <NotificationCenter />, "mygrid" brand
    BottomTabBar.tsx   — 6 tabova, fixed, left:260px, bottom:18px

  dashboard/
    DashboardPage.tsx  — grid layout, state za activeNav/activeTab
    PerspectiveGrid.tsx — SVG pozadina sa perspektivnim linijama
    CardHead.tsx       — header komponenta za kartice (icon, color, title, aside)
    cards/
      ReportsCard.tsx
      ActivityCard.tsx
      FinanceCards.tsx  — BankBalanceCard, SupplierSaldoCard, PdvCard
      StanoviCard.tsx
      GorivoCard.tsx
      PlateCard.tsx
      SastanciCard.tsx

  notifications/
    NotificationCenter.tsx  — orchestrator: spaja Bell + oba modala
    NotificationBell.tsx    — bell dugme + dropdown (5 poslednjih, akcije)
    SendNotificationModal.tsx — modal za slanje obaveštenja
    HistoryModal.tsx         — istorija sa filterima, brisanje, task toggle

lib/
  useNotifications.ts   — custom hook, localStorage persistencija

types/
  notifications.ts      — Notification interface, Sektor union type
```

---

## Tipovi podataka

```typescript
// types/notifications.ts
type Sektor = "svi" | "finansije" | "prodaja" | "gradiliste" | "administracija";

interface Notification {
  id: string;
  title: string;
  message: string;
  audience: Sektor[];
  urgent: boolean;
  isTask: boolean;
  taskDone: boolean;
  createdAt: string; // ISO string
  sentBy: string;
}
```

---

## useNotifications hook

localStorage ključevi: `mg_notifications`, `mg_notif_read`  
Vraća: `{ notifications, unreadCount, urgentUnread, readIds, send, markRead, markAllRead, toggleTaskDone, deleteNotif }`

- `send(title, message, audience, urgent, isTask)` — kreira novi, prepend, max 200
- `unreadCount` — broj notifikacija koje nisu u `readIds`

---

## Layout

```
┌─────────────────────────────────────────┐
│ Sidebar (260px) │ TopBar + kartica grid │
│                 │                       │
│  Nav stavke     │  Row 1: 2 kartice     │
│  Brzi kontakti  │  Row 2: 3 kartice     │
│  User card      │  Row 3: 4 kartice     │
│                 │                       │
│                 │  [BottomTabBar]       │
└─────────────────────────────────────────┘
```

Sidebar nav stavke: `dash`, `fin`, `pro`, `grad`, `adm`  
BottomTabBar stavke: `dash`, `fin`, `pro`, `izv`, `dok`, `pre`

---

## Kodne konvencije

- Sve komponente imaju `"use client"` direktive (App Router).
- Ikoni primaju `w` i `h` props: `<IconBell w={20} h={20} />`.
- CardHead prima `color: "blue" | "green" | "amber" | "gray" | "violet"`.
- Ne koristiti Tailwind klase u JSX — samo inline styles sa `var()` referencama.
- Ne dodavati komentare osim kad je razlog neočigledan.
- TypeScript strict mode — nikad dva ista ključa u jednom style objektu.
- Provjeri s `npx tsc --noEmit` pre nego što prijaviš zadatak kao gotov.

---

## Auth sloj (implementiran)

```
lib/
  axios.ts      — Axios instanca (baseURL iz env, Bearer token interceptor iz mg_token cookie)
  auth.ts       — setToken / getToken / removeToken (cookie helpers, ključ: mg_token)
  useUser.ts    — hook: fetchuje /api/{tenant}/user, redirect na /login ako token nedostaje

middleware.ts   — Next.js Edge middleware:
                  /  → /dashboard (s tokenom) ili /login (bez tokena)
                  /dashboard/* bez tokena → /login
                  /login s tokenom → /dashboard

.env.local      — NEXT_PUBLIC_API_URL=http://localhost:8000
                  NEXT_PUBLIC_TENANT_ID=grid

types/
  auth.ts       — AuthUser interface { id, name, email, phone, roles[] }
```

### Login tok
1. `GET /sanctum/csrf-cookie` (CSRF handshake)
2. `POST /api/{tenantId}/login` → `{ token, user }`
3. Token se upisuje u `mg_token` cookie (path=/, max-age=7 dana, SameSite=Lax)
4. Redirect na `/dashboard`

## Backend

Laravel REST API na `http://localhost:8000`.  
Auth je implementiran i povezan. Modul API-ji (Finansije, Prodaja...) još nisu implementirani.  
Kad se implementiraju, odgovarajuće komponente treba ažurirati da koriste API pozive umjesto mock podataka.
