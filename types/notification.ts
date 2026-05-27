export type RecipientType =
  | "vlasnik"
  | "administracija"
  | "finansije"
  | "gradiliste"
  | "svi";

export interface AppNotification {
  id: number;
  sender_id: number;
  sender_name: string;
  audience: RecipientType[];
  title: string;
  content: string;
  is_read: boolean;
  urgent: boolean;
  is_task: boolean;
  task_done: boolean;
  created_at: string;
}
