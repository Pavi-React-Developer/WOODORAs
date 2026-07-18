import React, { useState, useEffect } from 'react';
import { cmsService } from '../api/cmsService';
import { getImageSrc } from '../utils/imageUtils';

export default function Footer() {
  const [footerData, setFooterData] = useState(null);

  useEffect(() => {
    cmsService.getFooter()
      .then(res => {
        if (res.data) setFooterData(res.data);
      })
      .catch(console.error);
  }, []);

  const defaultColumns = [
    {
      title: 'Shop',
      links: [
        { label: 'New Arrivals', url: '#' },
        { label: 'Best Sellers', url: '#' },
        { label: 'Gift Sets', url: '#' },
        { label: 'Sustainability', url: '#' },
      ]
    },
    {
      title: 'Support',
      links: [
        { label: 'Our Story', url: '#' },
        { label: 'Shipping & Returns', url: '#' },
        { label: 'Wholesale', url: '#' },
        { label: 'Contact Us', url: '#' },
      ]
    },
    {
      title: 'Policies',
      links: [
        { label: 'Privacy Policy', url: '#' },
        { label: 'Terms of Service', url: '#' },
        { label: 'Cookie Policy', url: '#' },
      ]
    }
  ];

  const columnsToRender = footerData?.columns?.length > 0 ? footerData.columns : defaultColumns;

  return (
    <footer className="bg-[#FDF9F1] border-t border-[#E9DED3] pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand Col */}
          <div className="space-y-4">
            <h3 className="font-serif text-xl font-bold text-brand-dark">{footerData?.logo ? <img src={getImageSrc(footerData.logo)} alt="Logo" className="h-8 object-contain" /> : 'WoodenToys'}</h3>
            <p className="text-xs text-brand-medium leading-relaxed max-w-xs">
              {footerData?.description || 'Crafting heirloom quality toys from sustainable forests for a cleaner tomorrow and more creative today.'}
            </p>
            <div className="flex gap-4 pt-2">
              <a href={footerData?.instagram || '#'} className="text-brand-medium hover:text-brand-dark transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href={footerData?.twitter || '#'} className="text-brand-medium hover:text-brand-dark transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </a>
            </div>
          </div>

          {/* Dynamic Columns */}
          {columnsToRender.map((col, idx) => (
            <div key={idx} className="space-y-4">
              <h4 className="text-[10px] font-bold text-brand-dark uppercase tracking-widest">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link, lIdx) => (
                  <li key={lIdx}><a href={link.url} className="text-xs text-brand-medium hover:text-brand-dark transition-colors">{link.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-brand-medium">
            {footerData?.copyright || '© 2026 WoodenToys. Built for generations.'}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-brand-medium">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Global Shipping Available
          </div>
        </div>
      </div>
    </footer>
  );
}
