import React, { useState } from 'react';
import NavbarAdmin from './NavbarAdmin';
import HeroBannerAdmin from './HeroBannerAdmin';
import ThirdBannerAdmin from './ThirdBannerAdmin';
import ProductGridAdmin from './ProductGridAdmin';
import CategoryGridAdmin from './CategoryGridAdmin';
import CategoriesGridAdmin from './CategoriesGridAdmin';
import GiftCardBannerAdmin from './GiftCardBannerAdmin';
import CustomizeBannerAdmin from './CustomizeBannerAdmin';
import BulkOrderBannerAdmin from './BulkOrderBannerAdmin';
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
  { id: 'bulk-order', label: '📦 Bulk Order' },
  { id: 'footer', label: '📋 Footer' },
  { id: 'reviews', label: '⭐ Reviews' },
];

export default function HomePageCMS({ canCreate, canEdit, canDelete }) {
  const [activeTab, setActiveTab] = useState('layout');
  const [refreshKey, setRefreshKey] = useState(0);

  const renderTab = () => {
    switch (activeTab) {
      case 'layout': return <HomeLayoutBuilder key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      case 'navbar': return <NavbarAdmin key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      case 'hero': return <HeroBannerAdmin key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      case 'third': return <ThirdBannerAdmin key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      case 'grid': return <ProductGridAdmin key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      case 'category-grid': return <CategoryGridAdmin key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      case 'categories-grid': return <CategoriesGridAdmin key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      case 'gift-card': return <GiftCardBannerAdmin key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      case 'customize': return <CustomizeBannerAdmin key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      case 'bulk-order': return <BulkOrderBannerAdmin key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      case 'footer': return <FooterAdmin key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      case 'reviews': return <ReviewAdmin key={refreshKey} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; <span className="font-semibold text-[#8B5E3C]">Home Page CMS</span>
          </p>
          <h2 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Home Page CMS</h2>
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
            className={`px-5 py-2.5 text-sm font-semibold rounded-full transition-all ${
              activeTab === tab.id
                ? 'bg-[#8B5E3C] text-white shadow-md'
                : 'bg-white text-[#8A817C] border border-[#E6DFD4] hover:bg-[#F8F4EC] hover:text-[#8B5E3C]'
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
