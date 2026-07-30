import { create } from 'zustand';
import { systemSettingService } from '../api/systemSettingService';

export const useConfigStore = create((set, get) => ({
  walletEnabled: true,
  isLoadingConfig: false,

  fetchWalletConfig: async () => {
    set({ isLoadingConfig: true });
    try {
      const res = await systemSettingService.getWalletConfig();
      set({ walletEnabled: res.walletEnabled });
    } catch (error) {
      console.error('Failed to fetch wallet configuration:', error);
      // Fallback to true or handle gracefully
    } finally {
      set({ isLoadingConfig: false });
    }
  },

  updateWalletConfig: async (walletEnabled) => {
    try {
      const res = await systemSettingService.updateWalletConfig(walletEnabled);
      set({ walletEnabled: res.walletEnabled });
      return res;
    } catch (error) {
      console.error('Failed to update wallet configuration:', error);
      throw error;
    }
  },
}));
