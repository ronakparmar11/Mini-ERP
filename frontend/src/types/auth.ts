export type Role = "ADMIN" | "SYSTEM_USER";

export interface LoginInput {
  email: string;
  password: string;
}

/** Response of POST /auth/login. */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: Role;
}

/** UserOut from GET /auth/me. */
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}
