import type { StoreGet, StoreSet } from "../types";
import { isFourDigitPin } from "../types";

export function createPinSlice(set: StoreSet, get: StoreGet) {
  return {
    unlock: (pin: string) => {
      if (pin !== get().settings.pin) return false;
      set({ unlocked: true });
      return true;
    },
    lock: () => set({ unlocked: false }),
    setPin: (current: string, next: string) => {
      if (current !== get().settings.pin) return false;
      if (!isFourDigitPin(next)) return false;
      if (next === current) return true;
      set((s) => ({ settings: { ...s.settings, pin: next } }));
      get().appendAudit("settings", "pin", "PIN changed");
      return true;
    },
  };
}
