import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {UserStore} from "@/lib/types/store";

export const useUserStore = create<UserStore>()(
    persist(
        (set) => ({
            user: null,

            setUser: (user) => set({ user }),

            clearUser: () => set({ user: null }),
        }),
        {
            name: "user-store",
            storage: createJSONStorage(() => localStorage),
        }
    )
);
