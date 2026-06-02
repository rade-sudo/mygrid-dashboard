export interface ActivityLog {
  id: number;
  user_id: number | null;
  action: string;
  description: string;
  user?: { id: number; name: string } | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityGroup {
  label: string;
  items: ActivityLog[];
}

export interface ActivityPage {
  data: ActivityLog[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}
