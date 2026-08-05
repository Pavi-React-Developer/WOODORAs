import React, { useState } from 'react';
import NavbarAdmin from './NavbarAdmin';
import HeroBannerAdmin from './HeroBannerAdmin';
import ThirdBannerAdmin from './ThirdBannerAdmin';
import ProductGridAdmin from './ProductGridAdmin';
import CategoryGridAdmin from './CategoryGridAdmin';
import CategoriesGridAdmin from './CategoriesGridAdmin';
import GiftCardBannerAdmin from './GiftCardBannerAdmin';
import CustomizeBannerAdmin from './CustomizeBannerAdmin';
import FooterAdmin from './FooterAdmin';
import ReviewAdmin from './ReviewAdmin';
import HomeLayoutBuilder from './HomeLayoutBuilder';
import { RefreshCw } from 'lucide-react';

const TABS = [
  { id: 'layout', label: '🛠️ Layout Builder' },
  { id: 'navbar', label: '🔗 Navbar' },
  { id: 'hero', label: '🖼️ Hero Banner' },
  { id: 'third', label: '🎨 Third Banner' },
  { id: 'grid', label: '📦 Product Grid' },
  { id: 'category-grid', label: '🗂️ Category Grid' },
  { id: 'categories-grid', label: '🗂️ Categories Grid' },
  { id: 'gift-card', label: '🎁 Gift & Card' },
  { id: 'customize', label: '🖌️ Customize' },
  { id: 'footer', label: '📋 Footer' },
  { id: 'reviews', label: '⭐ Reviews' },
];

export default function HomePageCMS() {
  const [activeTab, setActiveTab] = useState('layout');
  const [refreshKey, setRefreshKey] = useState(0);

  const renderTab = () => {
    switch (activeTab) {
      case 'layout': return <HomeLayoutBuilder key={refreshKey} />;
      case 'navbar': return <NavbarAdmin key={refreshKey} />;
      case 'hero': return <HeroBannerAdmin key={refreshKey} />;
      case 'third': return <ThirdBannerAdmin key={refreshKey} />;
      case 'grid': return <ProductGridAdmin key={refreshKey} />;
      case 'category-grid': return <CategoryGridAdmin key={refreshKey} />;
      case 'categories-grid': return <CategoriesGridAdmin key={refreshKey} />;
      case 'gift-card': return <GiftCardBannerAdmin key={refreshKey} />;
      case 'customize': return <CustomizeBannerAdmin key={refreshKey} />;
      case 'footer': return <FooterAdmin key={refreshKey} />;
      case 'reviews': return <ReviewAdmin key={refreshKey} />;
      default: return null;
    }
  };

  return (
    <div className="w-full flex flex-col p-6 gap-6">
      <div className="w-full flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#4A403B]">Home Page CMS</h2>
          <p className="text-sm text-[#8A817C] mt-1">Manage all dynamic content on the homepage.</p>
        </div>
        <button onClick={() => setRefreshKey(prev => prev + 1)} className="admin-secondary-btn flex items-center gap-2">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Tab Navigation - Old Model (Horizontal) */}
      <div className="w-full flex flex-row flex-wrap items-center gap-3 border-b border-[#E6DFD4] pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              activeTab === tab.id
                ? 'bg-[#4A403B] text-white shadow-md'
                : 'bg-white text-[#8A817C] border border-[#E6DFD4] hover:bg-[#F8F4EC] hover:text-[#4A403B]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="w-full">
        {renderTab()}
      </div>
    </div>
  );
}
