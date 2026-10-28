import { create } from "zustand";
import type { components } from "@/shared/api";

export type Account = components["schemas"]["AccountOut"];

interface SessionState {
  account: Account | null;
  token: string | null;
  expiresAt: number;
  ready: boolean;
  dialog: boolean;
  open: () => void;
  close: () => void;
}

export const useSession = create<SessionState>((set) => ({
  account: null,
  token: null,
  expiresAt: 0,
  ready: false,
  dialog: false,
  open: () => set({ dialog: true }),
  close: () => set({ dialog: false }),
}));
