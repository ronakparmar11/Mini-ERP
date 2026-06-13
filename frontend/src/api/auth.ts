import type { LoginInput, TokenResponse, User } from "@/types/auth";

import { api } from "./axios";

/** POST /auth/login — exchange credentials for a JWT. */
export const loginRequest = (data: LoginInput): Promise<TokenResponse> =>
  api.post<TokenResponse>("/auth/login", data).then((r) => r.data);

/** GET /auth/me — hydrate the current user from a stored token. */
export const fetchCurrentUser = (): Promise<User> =>
  api.get<User>("/auth/me").then((r) => r.data);
