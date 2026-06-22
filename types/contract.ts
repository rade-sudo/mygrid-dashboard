export interface Contract {
  id: number;
  contract_date: string;
  contract_type: string;
  contracting_party: string;
  value: string | null;
  note: string | null;
  document_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractFormData {
  contract_date: string;
  contract_type: string;
  contracting_party: string;
  value: string;
  note: string;
}

export const CONTRACT_TYPES = [
  "Ugovor o radu",
  "Ugovor o radu na određeno vreme",
  "Ugovor o delu",
  "Ugovor o nabavci",
  "Ugovor o zakupu",
  "Ugovor o pružanju usluga",
  "Ugovor o saradnji",
  "Ostalo",
] as const;

export const EMPTY_CONTRACT_FORM: ContractFormData = {
  contract_date: "",
  contract_type: "Ugovor o radu",
  contracting_party: "",
  value: "",
  note: "",
};
