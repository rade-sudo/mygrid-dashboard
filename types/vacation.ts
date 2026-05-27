export interface VacationEmployee {
  id: number;
  first_name: string;
  last_name: string;
  sector: string;
  position: string;
}

export interface Vacation {
  id: number;
  employee_id: number;
  start_date: string;
  end_date: string;
  type: VacationType;
  note: string | null;
  created_at: string;
  updated_at: string;
  employee: VacationEmployee;
}

export interface VacationFormData {
  employee_id: number | "";
  start_date: string;
  end_date: string;
  type: VacationType;
  note: string;
}

export type VacationType = "godisnji" | "bolovanje" | "neplaceno" | "ostalo";

export const VACATION_TYPES: { value: VacationType; label: string }[] = [
  { value: "godisnji", label: "Godišnji odmor" },
  { value: "bolovanje", label: "Bolovanje" },
  { value: "neplaceno", label: "Neplaćeno odsustvo" },
  { value: "ostalo", label: "Ostalo" },
];

export const EMPTY_VACATION_FORM: VacationFormData = {
  employee_id: "",
  start_date: "",
  end_date: "",
  type: "godisnji",
  note: "",
};
