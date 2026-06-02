export interface Client {
  id: number;
  name: string;
  pib: string | null;
  maticni_broj: string | null;
  ziro_racun: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientFormData {
  name: string;
  pib: string;
  maticni_broj: string;
  ziro_racun: string;
  address: string;
  email: string;
  phone: string;
}

export const EMPTY_CLIENT_FORM: ClientFormData = {
  name: "", pib: "", maticni_broj: "", ziro_racun: "", address: "", email: "", phone: "",
};

export interface OutboundInvoiceItem {
  id: number;
  outbound_invoice_id: number;
  sektor: string | null;
  jedinica: string | null;
  kategorija: string | null;
  kolicina: string;
  mera: string;
  iznos: string;
  created_at: string;
  updated_at: string;
}

export interface OutboundInvoiceItemFormData {
  sektor: string;
  jedinica: string;
  kategorija: string;
  kolicina: string;
  mera: string;
  iznos: string;
}

export const EMPTY_OUTBOUND_ITEM: OutboundInvoiceItemFormData = {
  sektor: "", jedinica: "", kategorija: "", kolicina: "1", mera: "kom", iznos: "",
};

export interface OutboundInvoicePayment {
  id: number;
  outbound_invoice_id: number;
  amount: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
}

export interface OutboundInvoicePaymentFormData {
  amount: string;
  payment_date: string;
}

export interface OutboundInvoice {
  id: number;
  client_id: number;
  client: Client;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  description: string | null;
  amount_without_vat: string;
  vat_rate: number;
  vat_amount: string;
  total_amount: string;
  status: "unpaid" | "partial" | "paid";
  document_path: string | null;
  is_cash: boolean;
  payments: OutboundInvoicePayment[];
  items: OutboundInvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface OutboundInvoiceFormData {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  description: string;
  amount_without_vat: string;
  vat_rate: number;
  vat_amount: string;
  total_amount: string;
  is_cash: boolean;
  payments: OutboundInvoicePaymentFormData[];
  items: OutboundInvoiceItemFormData[];
}

export const EMPTY_OUTBOUND_INVOICE_FORM: OutboundInvoiceFormData = {
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
  items: [{ ...EMPTY_OUTBOUND_ITEM }],
};

export function outboundInvoiceToForm(inv: OutboundInvoice): OutboundInvoiceFormData {
  return {
    invoice_number:     inv.invoice_number,
    issue_date:         inv.issue_date,
    due_date:           inv.due_date ?? "",
    description:        inv.description ?? "",
    amount_without_vat: inv.amount_without_vat,
    vat_rate:           inv.vat_rate ?? 20,
    vat_amount:         inv.vat_amount,
    total_amount:       inv.total_amount,
    is_cash:            inv.is_cash ?? false,
    payments: inv.is_cash
      ? []
      : (inv.payments ?? []).map((p) => ({
          amount:       p.amount,
          payment_date: p.payment_date,
        })),
    items: (inv.items ?? []).length > 0
      ? inv.items.map((item) => ({
          sektor:     item.sektor ?? "",
          jedinica:   item.jedinica ?? "",
          kategorija: item.kategorija ?? "",
          kolicina:   item.kolicina,
          mera:       item.mera,
          iznos:      item.iznos,
        }))
      : [{ ...EMPTY_OUTBOUND_ITEM }],
  };
}
