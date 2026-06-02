export interface Bank {
  id: number;
  name: string;
  starting_balance: string;
  current_balance: string;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: number;
  bank_id: number;
  date: string;
  type: "priliv" | "odliv";
  amount: string;
  description: string | null;
  reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanceStats {
  total_bank_balance: number;
  total_invoices_outstanding: number;
  outstanding_supplier_count: number;
  total_outbound_outstanding: number;
  outstanding_client_count: number;
  monthly_incoming_vat: number;
  monthly_outbound_vat: number;
}

export interface BankFormData {
  name: string;
  starting_balance: string;
}

export interface TransactionFormData {
  date: string;
  type: "priliv" | "odliv";
  amount: string;
  description: string;
  reference: string;
}

export const EMPTY_BANK_FORM: BankFormData = {
  name: "",
  starting_balance: "0",
};

export const EMPTY_TRANSACTION_FORM: TransactionFormData = {
  date: "",
  type: "priliv",
  amount: "",
  description: "",
  reference: "",
};
