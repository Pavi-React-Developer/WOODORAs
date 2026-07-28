import { create } from 'zustand';
import { addressService } from '../api/addressService';
import { authService } from '../api/authService';

const LOCAL_STORAGE_KEY = 'wooden_toys_addresses';

const getGuestAddresses = () => {
    try {
        return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    } catch {
        return [];
    }
};

const setGuestAddresses = (addrs) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(addrs));
};

const useAddressStore = create((set, get) => ({
    addresses: [],
    loading: false,
    error: null,

    fetchAddresses: async () => {
        set({ loading: true, error: null });
        if (!authService.isAuthenticated()) {
            set({ addresses: getGuestAddresses(), loading: false });
            return;
        }
        try {
            const data = await addressService.getAddresses();
            set({ addresses: data.addresses || [], loading: false });
        } catch (error) {
            set({ error: error.message || 'Failed to fetch addresses', loading: false });
        }
    },

    addAddress: async (addressData) => {
        set({ loading: true, error: null });
        if (!authService.isAuthenticated()) {
            const current = getGuestAddresses();
            const newAddr = { ...addressData, _id: Date.now().toString() };
            if (newAddr.isDefault) current.forEach(a => a.isDefault = false);
            const updated = [...current, newAddr];
            if (updated.length === 1) updated[0].isDefault = true;
            setGuestAddresses(updated);
            set({ addresses: updated, loading: false });
            return { success: true };
        }
        try {
            const data = await addressService.addAddress(addressData);
            set({ addresses: data.addresses || [], loading: false });
            return { success: true };
        } catch (error) {
            set({ error: error.message || 'Failed to add address', loading: false });
            return { success: false, error };
        }
    },

    updateAddress: async (addressId, addressData) => {
        set({ loading: true, error: null });
        if (!authService.isAuthenticated()) {
            const current = getGuestAddresses();
            if (addressData.isDefault) current.forEach(a => a.isDefault = false);
            const updated = current.map(a => a._id === addressId ? { ...a, ...addressData } : a);
            setGuestAddresses(updated);
            set({ addresses: updated, loading: false });
            return { success: true };
        }
        try {
            const data = await addressService.updateAddress(addressId, addressData);
            set({ addresses: data.addresses || [], loading: false });
            return { success: true };
        } catch (error) {
            set({ error: error.message || 'Failed to update address', loading: false });
            return { success: false, error };
        }
    },

    deleteAddress: async (addressId) => {
        set({ loading: true, error: null });
        if (!authService.isAuthenticated()) {
            const current = getGuestAddresses();
            const deleted = current.find(a => a._id === addressId);
            const updated = current.filter(a => a._id !== addressId);
            if (deleted?.isDefault && updated.length > 0) updated[0].isDefault = true;
            setGuestAddresses(updated);
            set({ addresses: updated, loading: false });
            return { success: true };
        }
        try {
            const data = await addressService.deleteAddress(addressId);
            set({ addresses: data.addresses || [], loading: false });
            return { success: true };
        } catch (error) {
            set({ error: error.message || 'Failed to delete address', loading: false });
            return { success: false, error };
        }
    },
    
    clearAddresses: () => set({ addresses: [], error: null })
}));

export default useAddressStore;
