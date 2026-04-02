import { create } from "zustand";

interface UiState {
  mobileSidebarOpen: boolean;
  unreadNotifications: number;
  unreadChat: number;
  setMobileSidebarOpen: (open: boolean) => void;
  setUnreadNotifications: (count: number) => void;
  setUnreadChat: (count: number) => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileSidebarOpen: false,
  unreadNotifications: 0,
  unreadChat: 0,
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  setUnreadChat: (count) => set({ unreadChat: count }),
}));

