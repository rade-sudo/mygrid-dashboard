export interface Supplier {
  id: number;
  name: string;
  pib: string | null;
  maticni_broj: string | null;
  address: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierFormData {
  name: string;
  pib: string;
  maticni_broj: string;
  address: string;
  phone: string;
}

export const EMPTY_SUPPLIER_FORM: SupplierFormData = {
  name: "",
  pib: "",
  maticni_broj: "",
  address: "",
  phone: "",
};

export interface InvoicePayment {
  id: number;
  incoming_invoice_id: number;
  amount: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentEntry {
  amount: string;
  payment_date: string;
}

export interface InvoiceItem {
  id: number;
  incoming_invoice_id: number;
  sektor: string | null;
  jedinica: string | null;
  kategorija: string | null;
  sector_id: number | null;
  organizational_unit_id: number | null;
  expense_category_id: number | null;
  kolicina: string;
  mera: string;
  iznos: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItemFormData {
  sektor: string;
  jedinica: string;
  kategorija: string;
  sector_id: number | null;
  organizational_unit_id: number | null;
  expense_category_id: number | null;
  kolicina: string;
  mera: string;
  iznos: string;
}

export interface IncomingInvoice {
  id: number;
  supplier_id: number;
  supplier: Supplier;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  description: string | null;
  amount_without_vat: string;
  vat_rate: number;
  vat_amount: string;
  total_amount: string;
  status: "neplaceno" | "placeno" | "delimicno";
  is_cash: boolean;
  payments: InvoicePayment[];
  items: InvoiceItem[];
  document_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceFormData {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  description: string;
  amount_without_vat: string;
  vat_rate: number;
  vat_amount: string;
  total_amount: string;
  is_cash: boolean;
  payments: PaymentEntry[];
  items: InvoiceItemFormData[];
}

export const EMPTY_ITEM: InvoiceItemFormData = {
  sektor: "",
  jedinica: "",
  kategorija: "",
  sector_id: null,
  organizational_unit_id: null,
  expense_category_id: null,
  kolicina: "1",
  mera: "kom",
  iznos: "",
};

export const EMPTY_INVOICE_FORM: InvoiceFormData = {
  invoice_number: "",
  issue_date: "",
  due_date: "",
  description: "",
  amount_without_vat: "0.00",
  vat_rate: 20,
  vat_amount: "0.00",
  total_amount: "0.00",
  is_cash: false,
  payments: [],
  items: [{ ...EMPTY_ITEM }],
};

export function invoiceToForm(inv: IncomingInvoice): InvoiceFormData {
  return {
    invoice_number:     inv.invoice_number,
    issue_date:         inv.issue_date,
    due_date:           inv.due_date ?? "",
    description:        inv.description ?? "",
    amount_without_vat: inv.amount_without_vat,
    vat_rate:           inv.vat_rate ?? 0,
    vat_amount:         inv.vat_amount,
    total_amount:       inv.total_amount,
    is_cash:            inv.is_cash,
    payments:           (inv.payments ?? []).map(p => ({
      amount:       p.amount,
      payment_date: p.payment_date,
    })),
    items: (inv.items ?? []).length > 0
      ? inv.items.map(item => ({
          sektor:                  item.sektor ?? "",
          jedinica:                item.jedinica ?? "",
          kategorija:              item.kategorija ?? "",
          sector_id:               item.sector_id ?? null,
          organizational_unit_id:  item.organizational_unit_id ?? null,
          expense_category_id:     item.expense_category_id ?? null,
          kolicina:                item.kolicina,
          mera:                    item.mera,
          iznos:                   item.iznos,
        }))
      : [{ ...EMPTY_ITEM }],
  };
}
