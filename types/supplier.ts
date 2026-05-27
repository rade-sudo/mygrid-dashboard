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

export interface IncomingInvoice {
  id: number;
  supplier_id: number;
  supplier: Supplier;
  invoice_number: string;
  issue_date: string;
  due_date: string | null;
  description: string | null;
  amount_without_vat: string;
  vat_amount: string;
  total_amount: string;
  status: "neplaceno" | "placeno" | "delimicno";
  is_cash: boolean;
  payments: InvoicePayment[];
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
  vat_amount: string;
  total_amount: string;
  is_cash: boolean;
  payments: PaymentEntry[];
}

export const EMPTY_INVOICE_FORM: InvoiceFormData = {
  invoice_number: "",
  issue_date: "",
  due_date: "",
  description: "",
  amount_without_vat: "",
  vat_amount: "0",
  total_amount: "0.00",
  is_cash: false,
  payments: [],
};

export function invoiceToForm(inv: IncomingInvoice): InvoiceFormData {
  return {
    invoice_number:     inv.invoice_number,
    issue_date:         inv.issue_date,
    due_date:           inv.due_date ?? "",
    description:        inv.description ?? "",
    amount_without_vat: inv.amount_without_vat,
    vat_amount:         inv.vat_amount,
    total_amount:       inv.total_amount,
    is_cash:            inv.is_cash,
    payments:           (inv.payments ?? []).map(p => ({
      amount:       p.amount,
      payment_date: p.payment_date,
    })),
  };
}
