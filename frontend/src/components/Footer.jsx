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
  // Total columns = brand col + dynamic columns
  const totalCols = 1 + columnsToRender.length;

  return (
    <footer className="bg-[#5C2E0E] border-t border-[#7A3F1A] pt-8 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Columns with dynamic dividers */}
        <div className="flex flex-col md:flex-row gap-0 mb-8">

          {/* Brand Col */}
          <div className="flex-1 space-y-4 px-6 md:pl-0 md:pr-10 py-4 md:py-0">
            <h3 className="font-serif text-xl font-bold text-white">
              {footerData?.logo
                ? <img src={getImageSrc(footerData.logo)} alt="Logo" className="h-8 object-contain brightness-0 invert" />
                : <img src="/brand-logo.jpeg" alt="Marakathai Logo" className="h-8 object-contain brightness-0 invert" />
              }
            </h3>
            <p className="text-xs text-white/60 leading-relaxed max-w-xs">
              {footerData?.description || 'Crafting heirloom quality toys from sustainable forests for a cleaner tomorrow and more creative today.'}
            </p>
            <div className="flex gap-4 pt-2">
              {footerData?.facebook && (
                <a href={footerData.facebook} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                </a>
              )}
              {footerData?.instagram && (
                <a href={footerData.instagram} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              )}
              {footerData?.twitter && (
                <a href={footerData.twitter} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                </a>
              )}
              {footerData?.youtube && (
                <a href={footerData.youtube} target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                </a>
              )}
            </div>
          </div>

          {/* Dynamic Columns with dividers between each */}
          {columnsToRender.map((col, idx) => (
            <React.Fragment key={idx}>
              {/* Vertical divider line — shown between every column */}
              <div className="hidden md:block w-px bg-white/15 self-stretch mx-0" />
              {/* Horizontal divider on mobile */}
              <div className="block md:hidden h-px bg-white/15 mx-6 my-2" />

              <div className="flex-1 space-y-4 px-6 py-4 md:py-0">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <a href={link.url} className="text-xs text-white/60 hover:text-white transition-colors">
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/15 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] text-white/50">
            {footerData?.copyright || '© 2026 Marakathai. Built for generations.'}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-white/50">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            Global Shipping Available
          </div>
        </div>
      </div>
    </footer>
  );
}

