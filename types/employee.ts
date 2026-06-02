export type Sector = "gradiliste" | "pumpa" | "kancelarija" | "ostalo";
export type SalaryType = "satnica" | "fiksna_plata";
export type EmployeeStatus = "active" | "inactive";

export interface Employee {
  id: number;
  status: EmployeeStatus;
  first_name: string;
  last_name: string;
  jmbg: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  sector: Sector;
  position: string;
  employment_date: string | null;
  contract_number: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  salary_type: SalaryType;
  hourly_rate: string | null;
  fixed_salary: string | null;
  vacation_days_total: number | null;
  is_permanent: boolean;
  is_on_vacation: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeFormData {
  status: EmployeeStatus;
  first_name: string;
  last_name: string;
  jmbg: string;
  address: string;
  phone: string;
  email: string;
  sector: Sector;
  position: string;
  employment_date: string;
  contract_number: string;
  contract_start_date: string;
  contract_end_date: string;
  salary_type: SalaryType;
  hourly_rate: string;
  fixed_salary: string;
  vacation_days_total: string;
  is_permanent: boolean;
}

export const EMPTY_FORM: EmployeeFormData = {
  status: "active",
  first_name: "",
  last_name: "",
  jmbg: "",
  address: "",
  phone: "",
  email: "",
  sector: "kancelarija",
  position: "",
  employment_date: "",
  contract_number: "",
  contract_start_date: "",
  contract_end_date: "",
  salary_type: "fiksna_plata",
  hourly_rate: "",
  fixed_salary: "",
  vacation_days_total: "",
  is_permanent: false,
};
