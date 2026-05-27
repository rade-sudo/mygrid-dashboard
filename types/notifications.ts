export type Sektor =
  | "vlasnik"
  | "svi"
  | "finansije"
  | "prodaja"
  | "gradiliste"
  | "administracija";

export interface Notification {
  id: string;
  title: string;
  message: string;
  audience: Sektor[];
  urgent: boolean;
  isTask: boolean;
  taskDone: boolean;
  createdAt: string; // ISO
  sentBy: string;
}
