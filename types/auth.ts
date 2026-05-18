export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  roles: string[];
}
