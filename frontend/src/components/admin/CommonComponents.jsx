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
        green: 'bg-emerald-100 text-emerald-700',
        red: 'bg-red-100 text-red-700',
        amber: 'bg-amber-100 text-amber-700',
        blue: 'bg-blue-100 text-blue-700',
        purple: 'bg-purple-100 text-purple-700',
    };

    const sizes = {
        sm: 'px-2 py-0.5 text-[10px]',
        md: 'px-3 py-1 text-[11px]',
        lg: 'px-4 py-1.5 text-xs',
    };

    return (
        <span className={`inline-block rounded-full font-bold uppercase tracking-wider ${variants[variant] || variants.gray} ${sizes[size]}`}>
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

export const Avatar = ({ name = '?', size = 36, className = '' }) => {
    const safeName = name || '?';
    const c = safeName.trim()[0]?.toUpperCase() || '?';
    
    // 26 distinct colors mapping to A-Z
    const alphabetColors = [
        '#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB', 
        '#1E88E5', '#039BE5', '#00ACC1', '#00897B', '#43A047', 
        '#7CB342', '#C0CA33', '#FBC02D', '#FFB300', '#FB8C00', 
        '#F4511E', '#6D4C41', '#757575', '#546E7A', '#EC407A', 
        '#AB47BC', '#986ee1ff', '#5C6BC0', '#29B6F6', '#26A69A', 
        '#9CCC65'
    ];

    let bg = '#9E9E9E'; // Default for non-alphabet characters
    if (c >= 'A' && c <= 'Z') {
        const index = c.charCodeAt(0) - 65; // A=0, B=1, ..., Z=25
        bg = alphabetColors[index];
    }

    return (
        <div 
            className={`rounded-full text-white flex items-center justify-center font-bold flex-shrink-0 ${className}`}
            style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.45 }}
        >
            {c}
        </div>
    );
};

export const StatusBadge = ({ status }) => {
    if (!status) return null;
    const s = String(status).toLowerCase();
    let variant = 'bg-gray-100 text-gray-800';
    
    if (['active', 'published', 'delivered', 'approved', 'success'].includes(s)) {
        variant = 'bg-emerald-100 text-emerald-700';
    } else if (['inactive', 'cancelled', 'deleted', 'rejected', 'failed', 'blocked'].includes(s)) {
        variant = 'bg-red-100 text-red-700';
    } else if (['pending', 'draft', 'placed', 'processing'].includes(s)) {
        variant = 'bg-amber-100 text-amber-700';
    } else if (['shipping', 'packed', 'out for delivery', 'shipped'].includes(s)) {
        variant = 'bg-blue-100 text-blue-700';
    }

    return (
        <span className={`inline-block px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${variant}`}>
            {status}
        </span>
    );
};

export const ActiveBadge = ({ status }) => {
    // Normalize to a lowercase string for comparison
    const raw = status === undefined || status === null ? '' : String(status).toLowerCase().trim();

    let label, colorClass;

    if (raw === 'true' || raw === 'active' || raw === 'yes') {
        label = 'Active';
        colorClass = 'bg-green-100 text-green-700';
    } else if (raw === 'false' || raw === 'inactive' || raw === 'no') {
        label = 'Inactive';
        colorClass = 'bg-red-100 text-red-600';
    } else if (raw === 'required') {
        label = 'Required';
        colorClass = 'bg-orange-100 text-orange-700';
    } else if (raw === 'optional') {
        label = 'Optional';
        colorClass = 'bg-purple-100 text-purple-700';
    } else {
        // Fallback: capitalize whatever string was passed
        label = raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : 'Inactive';
        colorClass = 'bg-gray-100 text-gray-600';
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
            {label}
        </span>
    );
};

export const TypeBadge = ({ type }) => {
    if (!type) return null;
    const raw = String(type).toLowerCase().trim();
    
    let label = 'Text';
    let colorClass = 'bg-blue-100 text-blue-700';
    
    if (raw === 'dropdown') {
        label = 'Dropdown';
        colorClass = 'bg-pink-100 text-pink-700';
    } else if (raw === 'checkbox') {
        label = 'Checkbox';
        colorClass = 'bg-yellow-100 text-yellow-700';
    } else if (raw === 'text') {
        label = 'Text';
        colorClass = 'bg-blue-100 text-blue-700';
    } else {
        label = raw.charAt(0).toUpperCase() + raw.slice(1);
    }

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${colorClass}`}>
            {label}
        </span>
    );
};


export const RequestBadge = ({ status }) => {
    if (!status) return null;
    const s = String(status).toLowerCase();
    let cls = 'bg-gray-100 text-gray-800';
    if (['approved', 'success'].includes(s)) cls = 'bg-green-100 text-green-800';
    else if (['rejected', 'failed', 'cancelled'].includes(s)) cls = 'bg-red-100 text-red-800';
    else if (['pending', 'processing'].includes(s)) cls = 'bg-amber-100 text-amber-800';
    
    return (
        <span className={`px-2.5 py-1 text-sm font-medium rounded-full ${cls}`}>
            {status}
        </span>
    );
};

export const OrderBadge = ({ status }) => {
    if (!status) return null;
    const s = String(status).toLowerCase();
    let cls = 'bg-gray-100 text-gray-800';
    if (s === 'delivered') cls = 'bg-emerald-100 text-emerald-700';
    else if (['cancelled', 'returned'].includes(s)) cls = 'bg-red-100 text-red-700';
    else if (['placed', 'pending'].includes(s)) cls = 'bg-amber-100 text-amber-700';
    else if (s === 'packed') cls = 'bg-blue-100 text-blue-700';
    else if (s === 'shipping') cls = 'bg-indigo-100 text-indigo-700';
    else if (s === 'out for delivery') cls = 'bg-purple-100 text-purple-700';
    
    return (
        <span className={`px-2.5 py-1 text-sm font-medium rounded-full ${cls}`}>
            {status}
        </span>
    );
};

export default { SearchBar, FilterButton, Button, Badge, Card, Avatar, StatusBadge, ActiveBadge, RequestBadge, OrderBadge };
