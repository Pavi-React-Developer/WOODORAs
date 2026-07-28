import React, { useState, useEffect } from 'react';
import { MapPin, Edit3, Trash2, Plus, Check } from 'lucide-react';
import useAddressStore from '../store/useAddressStore';
import { authService } from '../api/authService';
import toast from 'react-hot-toast';

const emptyAddress = {
  label: 'Home',
  fullName: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pinCode: '',
  landmark: '',
  isDefault: false,
};

const Field = ({ label, value, onChange, required, type = 'text', className = '' }) => (
  <div className={className}>
    <label className="mb-1 block text-sm font-bold text-[#141225]">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[8px] border border-[#E9DED3] px-4 py-2 text-sm text-[#141225] outline-none focus:border-[#D9B382]"
      required={required}
    />
  </div>
);

export default function CustomerAddressManager() {
  const { addresses, loading, fetchAddresses, addAddress, updateAddress, deleteAddress } = useAddressStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAddress);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleOpenModal = (address = null) => {
    if (address) {
      setEditingId(address._id);
      setForm(address);
    } else {
      const currentUser = authService.getCurrentUser();
      setEditingId(null);
      setForm({ 
        ...emptyAddress, 
        fullName: currentUser?.name || '',
        phone: currentUser?.phone || '',
        isDefault: addresses.length === 0 
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyAddress);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    let res;
    if (editingId) {
      res = await updateAddress(editingId, form);
    } else {
      res = await addAddress(form);
    }

    if (res.success) {
      toast.success(editingId ? 'Address updated' : 'Address added');
      handleCloseModal();
    } else {
      toast.error(res.error || 'Failed to save address');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      const res = await deleteAddress(id);
      if (res.success) {
        toast.success('Address deleted');
      } else {
        toast.error(res.error || 'Failed to delete address');
      }
    }
  };

  return (
    <section className="px-5 py-7 lg:px-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#141225]">Addresses</h2>
          <p className="mt-1 text-sm text-[#6D625C]">Manage your shipping addresses.</p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="rounded-[8px] bg-[#9A6031] px-4 py-2 text-sm font-bold text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Address
        </button>
      </div>

      {loading && addresses.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">Loading addresses...</p>
      ) : addresses.length > 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {addresses.map((addr) => (
            <div key={addr._id} className="rounded-[14px] border border-[#E9DED3] bg-white p-5 relative">
              {addr.isDefault && (
                <span className="absolute top-4 right-4 bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Default
                </span>
              )}
              <p className="font-bold text-[#141225]">{addr.label}</p>
              <p className="mt-3 text-sm text-[#6D625C]">{addr.fullName} | {addr.phone}</p>
              <p className="mt-1 text-sm text-[#6D625C]">{addr.address}</p>
              <p className="mt-1 text-sm text-[#6D625C]">{addr.city}, {addr.state} - {addr.pinCode}</p>
              
              <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => handleOpenModal(addr)}
                  className="text-sm font-bold text-[#9A6031] flex items-center gap-1 hover:underline"
                >
                  <Edit3 className="w-4 h-4" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(addr._id)}
                  className="text-sm font-bold text-red-500 flex items-center gap-1 hover:underline"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 text-center bg-gray-50 py-10 rounded-xl border border-dashed border-gray-300">
          <MapPin className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          <h3 className="text-lg font-bold text-gray-700">No saved address</h3>
          <p className="text-sm text-gray-500 mb-4">Add a shipping address to use during checkout.</p>
          <button
            type="button"
            onClick={() => handleOpenModal()}
            className="rounded-[8px] bg-[#9A6031] px-4 py-2 text-sm font-bold text-white inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Address
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4 py-8 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-[18px] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-[#EFE6DD] pb-4">
              <h2 className="text-xl font-bold text-[#141225]">{editingId ? 'Edit Address' : 'Add New Address'}</h2>
              <button type="button" onClick={handleCloseModal} className="text-gray-400 hover:text-gray-700">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
              <Field label="Label (e.g. Home, Work)" value={form.label} onChange={(val) => setForm({ ...form, label: val })} required />
              <Field label="Full Name" value={form.fullName} onChange={(val) => setForm({ ...form, fullName: val })} required />
              <Field label="Phone" value={form.phone} onChange={(val) => setForm({ ...form, phone: val })} required />
              <Field label="Pincode" value={form.pinCode} onChange={(val) => setForm({ ...form, pinCode: val })} required />
              <Field className="md:col-span-2" label="Address" value={form.address} onChange={(val) => setForm({ ...form, address: val })} required />
              <Field label="City" value={form.city} onChange={(val) => setForm({ ...form, city: val })} required />
              <Field label="State" value={form.state} onChange={(val) => setForm({ ...form, state: val })} required />
              <Field className="md:col-span-2" label="Landmark (Optional)" value={form.landmark} onChange={(val) => setForm({ ...form, landmark: val })} />
              
              <div className="md:col-span-2 flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="w-4 h-4 accent-[#9A6031]"
                />
                <label htmlFor="isDefault" className="text-sm font-medium text-gray-700">Set as default address</label>
              </div>

              <div className="md:col-span-2 mt-4 flex justify-end gap-3">
                <button type="button" onClick={handleCloseModal} className="rounded-[8px] border border-gray-300 px-5 py-2 text-sm font-bold text-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="rounded-[8px] bg-[#9A6031] px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
