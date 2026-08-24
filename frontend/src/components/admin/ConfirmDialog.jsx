import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2, Info } from 'lucide-react';
import { Button } from './CommonComponents';

export const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to perform this action?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'danger',
    loading = false
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            iconBg: 'bg-red-100',
            iconColor: 'text-red-500',
            icon: Trash2,
            cancelBtn: 'border-red-200 text-red-600 hover:bg-red-50',
            confirmBtn: 'bg-red-600 hover:bg-red-700 text-white',
        },
        warning: {
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-500',
            icon: AlertTriangle,
            cancelBtn: 'border-amber-200 text-amber-600 hover:bg-amber-50',
            confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white',
        },
        success: {
            iconBg: 'bg-green-100',
            iconColor: 'text-green-500',
            icon: CheckCircle2,
            cancelBtn: 'border-green-200 text-green-600 hover:bg-green-50',
            confirmBtn: 'bg-green-600 hover:bg-green-700 text-white',
        },
        primary: {
            iconBg: 'bg-[#F8F4EC]',
            iconColor: 'text-[#8B5E3C]',
            icon: Info,
            cancelBtn: 'border-[#E6DFD4] text-[#8B5E3C] hover:bg-[#F8F4EC]',
            confirmBtn: 'bg-[#8B5E3C] hover:bg-[#7a5234] text-white',
        }
    };

    const style = variantStyles[variant] || variantStyles.danger;
    const Icon = style.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full transform scale-100 transition-transform duration-200">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${style.iconBg}`}>
                    <Icon className={`w-6 h-6 ${style.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 text-center mb-2">{title}</h3>
                <p className="text-sm text-gray-500 text-center mb-6">{message}</p>
                <div className="flex gap-3">
                    <button 
                        onClick={onClose} 
                        disabled={loading}
                        className={`flex-1 px-8 py-3 border rounded-full text-[15px] font-bold bg-white transition-colors shadow-sm uppercase tracking-wide disabled:opacity-50 ${style.cancelBtn}`}
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm} 
                        disabled={loading}
                        className={`flex-1 px-8 py-3 rounded-full text-[15px] font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 uppercase ${style.confirmBtn}`}
                    >
                        {loading && (
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
