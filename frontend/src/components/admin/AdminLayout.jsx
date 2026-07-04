import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
    Menu,
    X,
    Package,
    Tags,
    Grid3x3,
    Settings,
    LogOut,
    ChevronDown,
} from 'lucide-react';
import useAdminStore from '../../store/adminStore';

const AdminLayout = ({ children }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const location = useLocation();
    const { sidebarOpen, toggleSidebar } = useAdminStore();

    const menuItems = [
        {
            icon: <Package size={20} />,
            label: 'Products',
            href: '/admin/products',
            submenu: [
                { label: 'All Products', href: '/admin/products' },
                { label: 'Categories', href: '/admin/catalog/categories' },
                { label: 'Sub Categories', href: '/admin/catalog/subcategories' },
                { label: 'Attributes', href: '/admin/catalog/attributes' },
            ],
        },
        {
            icon: <Grid3x3 size={20} />,
            label: 'Catalog',
            href: '/admin/catalog',
            submenu: [
                { label: 'Categories', href: '/admin/catalog/categories' },
                { label: 'Sub Categories', href: '/admin/catalog/subcategories' },
                { label: 'Attributes', href: '/admin/catalog/attributes' },
                { label: 'Products', href: '/admin/products' },
            ],
        },
        {
            icon: <Settings size={20} />,
            label: 'Settings',
            href: '/admin/settings',
        },
    ];

    const isActive = (href) => location.pathname === href;
    const isSubmenuActive = (submenu) =>
        submenu && submenu.some((item) => location.pathname === item.href);

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside
                className={`${
                    sidebarOpen ? 'w-64' : 'w-20'
                } bg-gray-900 text-white transition-all duration-300 overflow-y-auto`}
            >
                {/* Logo */}
                <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                    <h1
                        className={`font-bold text-amber-400 ${
                            sidebarOpen ? 'text-xl' : 'text-xs text-center w-full'
                        }`}
                    >
                        {sidebarOpen ? 'Wooden Toys' : 'WT'}
                    </h1>
                </div>

                {/* Menu */}
                <nav className="p-4 space-y-2">
                    {menuItems.map((item, index) => (
                        <div key={index}>
                            <Link
                                to={item.href}
                                className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-colors ${
                                    isActive(item.href) || isSubmenuActive(item.submenu)
                                        ? 'bg-amber-700 text-white'
                                        : 'text-gray-300 hover:bg-gray-800'
                                }`}
                            >
                                {item.icon}
                                {sidebarOpen && <span>{item.label}</span>}
                                {sidebarOpen && item.submenu && (
                                    <ChevronDown size={16} className="ml-auto" />
                                )}
                            </Link>

                            {/* Submenu */}
                            {sidebarOpen &&
                                item.submenu &&
                                isSubmenuActive(item.submenu) && (
                                    <div className="mt-2 space-y-1 pl-4 border-l border-gray-700">
                                        {item.submenu.map((subitem, subindex) => (
                                            <Link
                                                key={subindex}
                                                to={subitem.href}
                                                className={`block px-4 py-2 rounded-lg text-sm transition-colors ${
                                                    isActive(subitem.href)
                                                        ? 'bg-amber-600 text-white'
                                                        : 'text-gray-400 hover:text-white'
                                                }`}
                                            >
                                                {subitem.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
                    <button
                        className={`flex items-center gap-4 w-full px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors ${
                            !sidebarOpen && 'justify-center'
                        }`}
                    >
                        <LogOut size={20} />
                        {sidebarOpen && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Navigation */}
                <header className="bg-white border-b border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between px-6 py-4">
                        <button
                            onClick={toggleSidebar}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {sidebarOpen ? (
                                <X size={24} />
                            ) : (
                                <Menu size={24} />
                            )}
                        </button>

                        <div className="flex items-center gap-4">
                            <button className="text-gray-600 hover:text-gray-900">
                                <Tags size={20} />
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="w-8 h-8 bg-amber-700 rounded-full flex items-center justify-center text-white font-bold">
                                        A
                                    </div>
                                    {dropdownOpen && <ChevronDown size={16} />}
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10">
                                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors">
                                            Profile
                                        </button>
                                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors text-red-600">
                                            Logout
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
