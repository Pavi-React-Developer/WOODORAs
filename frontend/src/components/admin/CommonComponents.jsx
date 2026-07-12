import React from 'react';
import { Search, Filter } from 'lucide-react';

export const SearchBar = ({ value, onChange, placeholder = 'Search...', className = '' }) => {
    return (
        <div className={`relative ${className}`}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
        </div>
    );
};

export const FilterButton = ({ label, options, value, onChange, className = '' }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Filter size={18} className="text-gray-600" />
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
                <option value="">{label}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    loading = false,
    ...props
}) => {
    const baseStyles = 'font-bold uppercase tracking-wider text-xs rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-sm cursor-pointer box-border';

    const variants = {
        primary: 'bg-[#8B5E3C] hover:bg-[#70482B] text-white disabled:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed',
        secondary: 'bg-white border border-[#E6DFD4] hover:bg-gray-50 text-brand-dark disabled:bg-gray-100',
        danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300',
        success: 'bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300',
        outline: 'border-2 border-[#8B5E3C] text-[#8B5E3C] hover:bg-[#EFEBE9] disabled:border-gray-300 disabled:text-gray-300',
    };

    const sizes = {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-5 text-xs',
        lg: 'h-12 px-6 text-sm',
    };

    return (
        <button
            disabled={disabled || loading}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            {children}
        </button>
    );
};

export const Badge = ({ children, variant = 'gray', size = 'md' }) => {
    const variants = {
        gray: 'bg-gray-100 text-gray-800',
        green: 'bg-green-100 text-green-800',
        red: 'bg-red-100 text-red-800',
        amber: 'bg-amber-100 text-amber-800',
    };

    const sizes = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1 text-sm',
    };

    return (
        <span className={`inline-block rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
            {children}
        </span>
    );
};

export const Card = ({ children, className = '', ...props }) => {
    return (
        <div
            className={`bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export default { SearchBar, FilterButton, Button, Badge, Card };
