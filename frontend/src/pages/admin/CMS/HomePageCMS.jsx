import React, { useState } from 'react';
import NavbarAdmin from './NavbarAdmin';
import HeroBannerAdmin from './HeroBannerAdmin';
import ThirdBannerAdmin from './ThirdBannerAdmin';
import ProductGridAdmin from './ProductGridAdmin';
import CategoryGridAdmin from './CategoryGridAdmin';
import FooterAdmin from './FooterAdmin';

const TABS = [
  { id: 'navbar', label: '🔗 Navbar' },
  { id: 'hero', label: '🖼️ Hero Banner' },
  { id: 'third', label: '🎨 Third Banner' },
  { id: 'grid', label: '📦 Product Grid' },
  { id: 'category-grid', label: '🗂️ Category Grid' },
  { id: 'footer', label: '📋 Footer' },
];

export default function HomePageCMS() {
  const [activeTab, setActiveTab] = useState('navbar');

  const renderTab = () => {
    switch (activeTab) {
      case 'navbar': return <NavbarAdmin />;
      case 'hero': return <HeroBannerAdmin />;
      case 'third': return <ThirdBannerAdmin />;
      case 'grid': return <ProductGridAdmin />;
      case 'category-grid': return <CategoryGridAdmin />;
      case 'footer': return <FooterAdmin />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-brand-dark">Home Page CMS</h2>
        <p className="text-sm text-brand-medium mt-1">Manage all dynamic content on the homepage.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-[#E6DFD4] pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-brand-dark text-white shadow'
                : 'bg-white text-brand-medium border border-[#E6DFD4] hover:bg-[#E6DFD4] hover:text-brand-dark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>{renderTab()}</div>
    </div>
  );
}
