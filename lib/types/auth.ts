import type { UserAuthPayload } from "@/shared/types/auth";

export type UseAuthReturn = {
  user: UserAuthPayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};
