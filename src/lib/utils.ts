import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const CURRENT_USER_CHANGED_EVENT = "homebase:current-user-changed";

export function buildFavoritesStorageKey(uid?: string | null, loggedIn?: boolean): string {
  const normalizedUid = uid?.trim();
  const keySuffix = loggedIn && normalizedUid ? normalizedUid : "guest";
  return `favoriteBoardinghouses:${keySuffix}`;
}
