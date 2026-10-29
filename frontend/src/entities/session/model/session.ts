import { create } from "zustand";
import type { components } from "@/shared/api";

export type Account = components["schemas"]["AccountOut"];

interface SessionState {
  account: Account | null;
  token: string | null;
  expiresAt: number;
  ready: boolean;
  dialog: boolean;
  intent: "login" | "register";
  open: (intent?: "login" | "register") => void;
  close: () => void;
}

export const useSession = create<SessionState>((set) => ({
  account: null,
  token: null,
  expiresAt: 0,
  ready: false,
  dialog: false,
  intent: "login",
  open: (intent = "login") => set({ dialog: true, intent }),
  close: () => set({ dialog: false }),
}));
