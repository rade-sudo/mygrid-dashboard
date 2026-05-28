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
| Obaveštenja (slanje, istorija) | Implementiran (backend API + localStorage fallback) |
| Finansije — Bankarski izvodi | Implementiran (CRUD + transakcije po banci) |
| Finansije — Ulazne fakture | Implementiran (CRUD, dobavljač combobox, upload dokumenta, plaćanja) |
| Finansije — Dobavljači | Implementiran (CRUD, slide-over forma) |
| Administracija — Zaposleni | Implementiran (CRUD, sektori, tip zarade) |
| Administracija — Ugovori | Implementiran (CRUD, tipovi, datumi isteka) |
| Administracija — Godišnji odmori | Implementiran (CRUD, status, period) |
| Prodaja | Nije implementirano |
| Gradilište | Nije implementirano |
| Pumpa | Preskočiti — ne implementirati |
| Vozila | Preskočiti — ne implementirati |
| Magacin | Preskočiti — ne implementirati |

---

## Dizajn sistem

### Pravila stila
- Komponente mogu koristiti i **Tailwind utility klase u JSX-u** i **React inline styles** — oba pristupa su dozvoljena i mogu se kombinovati.
- Font: **Geist Sans** + **Geist Mono** (paket `geist`, CSS vars `--font-geist-sans` / `--font-geist-mono`).
- Locale: `sr-Latn` za datume i vremena.
- CSS custom properties (`var(--brand)`, `var(--border)`...) dostupne su i iz inline stilova i iz Tailwind arbitrary values (`bg-[var(--brand)]`).

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
  layout.tsx           — Geist font (GeistSans + GeistMono), lang="sr", body font-family, TanStackProvider
  page.tsx             — root route → redirect na /dashboard

  login/
    page.tsx           — login forma (CSRF + POST, mg_token cookie)

  dashboard/
    page.tsx           — Dashboard kartice (mock podaci + API stats)

    finansije/
      page.tsx         — KPI kartice + ModuleCard navigacija
      banke/
        page.tsx       — lista bankovnih računa (CRUD)
        [id]/page.tsx  — transakcije po banci (CRUD, paginacija)
      dobavljaci/
        page.tsx       — lista dobavljača (CRUD, slide-over forma)
      ulazne-fakture/
        page.tsx       — lista faktura (CRUD, filter, paginacija, plaćanja, dokument)

    administracija/
      page.tsx         — KPI kartice + ModuleCard navigacija
      zaposleni/
        page.tsx       — lista zaposlenih (CRUD, sektori, tip zarade, slide-over)
      ugovori/
        page.tsx       — lista ugovora (CRUD, tip, datumi, slide-over)
      godisnji-odmori/
        page.tsx       — lista odsustva (CRUD, status, period, slide-over)

    obavjestenja/
      page.tsx         — dedikirana stranica za obaveštenja

components/
  ui/
    icons.tsx          — svi SVG ikoni (inline, stroke="currentColor", props: w, h)
    FilterDropdown.tsx — filter dropdown sa bojom (violet/green/brand/amber), active state
    DatePicker.tsx     — calendar picker, portaling, sr-Latn nazivi meseci
    CustomSelect.tsx   — select sa optional prefix labelom (pagination rows-per-page)
    FormDropdown.tsx   — jednostavan dropdown za forme

  layout/
    PageShell.tsx      — layout wrapper: Sidebar + TopBar + BottomTabBar + auth guard
    Sidebar.tsx        — 260px fixed sidebar, nav stavke, brzi kontakti, user card, AddUserPanel
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
    NotificationCenter.tsx    — orchestrator: spaja Bell + oba modala
    NotificationBell.tsx      — bell dugme + dropdown (5 poslednjih, akcije)
    SendNotificationModal.tsx — modal za slanje obaveštenja
    HistoryModal.tsx          — istorija sa filterima, brisanje, task toggle

lib/
  axios.ts            — Axios instanca (baseURL iz env, Bearer token interceptor)
  auth.ts             — setToken / getToken / removeToken (cookie helpers, mg_token)
  useUser.ts          — hook: fetchuje /api/{tenant}/user, redirect na /login
  useNotifications.ts — custom hook (localStorage + API fallback)

types/
  auth.ts             — AuthUser { id, name, email, phone, roles[] }
  bank.ts             — Bank, BankTransaction, BankFormData, TransactionFormData, FinanceStats
  supplier.ts         — Supplier, IncomingInvoice, IncomingInvoicePayment, SupplierFormData, InvoiceFormData
  employee.ts         — Employee, EmployeeFormData, Sector, SalaryType
  contract.ts         — Contract, ContractFormData
  vacation.ts         — Vacation, VacationFormData
  notification.ts     — Notification (backend API model)
  notifications.ts    — Notification (localStorage model), Sektor union type
```

---

## Tipovi podataka

```typescript
// types/notifications.ts (localStorage model)
type Sektor = "svi" | "finansije" | "prodaja" | "gradiliste" | "administracija";
interface Notification { id, title, message, audience: Sektor[], urgent, isTask, taskDone, createdAt, sentBy }

// types/bank.ts
interface Bank { id, name, account_number, current_balance, currency, note, created_at }
interface BankTransaction { id, bank_id, date, type: "uplata"|"isplata", amount, description, reference_number, created_at }
interface FinanceStats { total_balance, total_suppliers, total_invoices_unpaid, total_invoices_amount }

// types/supplier.ts
interface Supplier { id, name, pib, mb, address, city, email, phone, note, created_at }
interface IncomingInvoice { id, supplier_id, supplier?, invoice_number, invoice_date, due_date, total_amount, paid_amount, status: "placeno"|"neplaceno"|"delimicno", note, document_path, payments? }
interface IncomingInvoicePayment { id, incoming_invoice_id, amount, payment_date, note }

// types/employee.ts
type Sector = "gradiliste" | "pumpa" | "kancelarija" | "ostalo"
type SalaryType = "fiksna" | "satnica" | "ugovor"
interface Employee { id, first_name, last_name, email, phone, position, sector, salary_type, salary_amount, hire_date, note }

// types/contract.ts
interface Contract { id, employee_id, employee?, type, start_date, end_date, note }

// types/vacation.ts
interface Vacation { id, employee_id, employee?, start_date, end_date, type, status, note }
```

---

## useNotifications hook

localStorage ključevi: `mg_notifications`, `mg_notif_read`  
Vraća: `{ notifications, unreadCount, urgentUnread, readIds, send, markRead, markAllRead, toggleTaskDone, deleteNotif }`

- `send(title, message, audience, urgent, isTask)` — kreira novi, prepend, max 200
- `unreadCount` — broj notifikacija koje nisu u `readIds`

---

## Zavisnosti

```json
"@tanstack/react-query": "^5"   — server state, caching, mutations za sve API pozive
"react-hook-form": "^7"         — forme (useForm, useFieldArray, Controller)
"axios": "^1"                   — HTTP klijent
```

TanStack Query Provider je registrovan u `app/layout.tsx`.  
Svaka stranica koristi `useQuery` za čitanje i `useMutation` za pisanje — bez lokalnog `useState` za server podatke.

---

## UI komponente

### FilterDropdown
Styled filter dugme s popdown listom. Props: `value`, `onChange`, `placeholder`, `options`, `icon?`, `color?: "violet"|"green"|"brand"|"amber"`.  
Aktivna selekcija mijenja boju border/bg/teksta prema odabranom `color`.

### DatePicker
Kalendar picker s portalom (fixed pozicija, auto gore/dole). Props: `value: string` (YYYY-MM-DD), `onChange`.  
Exportuje `fmtDate(val)` helper za formatiranje u sr-Latn.

### FormDropdown
Jednostavan dropdown za forme. Props: `value`, `onChange`, `options: {value, label}[]`, `placeholder?`.

### CustomSelect
Select s opcionalnim prefiks labelom. Koristi se za paginaciju (rows per page). Props: `value`, `onChange`, `options`, `prefix?`.

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
- Tailwind klase u JSX su dozvoljene i mogu se kombinovati sa inline styles.
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

Laravel REST API na `http://localhost:8000`. Auth i svi poslovni moduli su implementirani i povezani.

### Implementirani API endpointi

| Ruta | Controller | Uloga |
|---|---|---|
| `GET /api/{t}/finance/stats` | FinanceStatsController | vlasnik, menadzer-finansija |
| `GET/POST/PUT/DELETE /api/{t}/banks` | BankController | vlasnik, menadzer-finansija |
| `GET/POST/PUT/DELETE /api/{t}/banks/{id}/transactions` | BankTransactionController | vlasnik, menadzer-finansija |
| `GET/POST/PUT/DELETE /api/{t}/finansije/suppliers` | SupplierController | vlasnik, menadzer-finansija |
| `GET/POST/PUT/DELETE /api/{t}/finansije/incoming-invoices` | IncomingInvoiceController | vlasnik, menadzer-finansija |
| `GET /api/{t}/finansije/incoming-invoices/{id}/document` | IncomingInvoiceController | vlasnik, menadzer-finansija |
| `GET /api/{t}/admin/stats` | AdminStatsController | vlasnik, administrator |
| `GET/POST/PUT/DELETE /api/{t}/employees` | EmployeeController | autentikovani |
| `GET/POST/PUT/DELETE /api/{t}/contracts` | ContractController | vlasnik, administrator |
| `GET/POST/PUT/DELETE /api/{t}/vacations` | VacationController | vlasnik, administrator |
| `GET/POST/PATCH/DELETE /api/{t}/notifications` | NotificationController | autentikovani |
| `GET/POST /api/{t}/users` | TenantUserController | vlasnik |

### Ulazne fakture — plaćanja
`IncomingInvoice` ima relacionih `payments: IncomingInvoicePayment[]`.  
Status (`placeno`, `neplaceno`, `delimicno`) se automatski izračunava na osnovu sume plaćanja vs `total_amount`.
