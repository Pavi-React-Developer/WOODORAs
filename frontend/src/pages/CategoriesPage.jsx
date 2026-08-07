import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { categoryV2API } from '../api/catalogV2Service';

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

const stagger = {
  visible: { transition: { staggerChildren: 0.05 } }
};

export default function CategoriesPage({ onNavigate }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    categoryV2API.getAll({ isActive: 'true' })
      .then(res => {
        const data = Array.isArray(res) ? res : (res.data || res.categories || []);
        setCategories(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[#FDF9F1] min-h-screen pt-4 pb-16 font-sans text-[#141225]">
      <div className="container px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumbs with generous margin top */}
        <div className="text-xs text-gray-500 mt-4 mb-8 flex items-center gap-2">
          <span className="cursor-pointer hover:text-gray-900 transition-colors" onClick={() => onNavigate('/')}>Home</span>
          <span>&gt;</span>
          <span className="cursor-pointer hover:text-gray-900 transition-colors" onClick={() => onNavigate('/products')}>Marakathai</span>
          <span>&gt;</span>
          <span className="font-semibold text-gray-900">Categories</span>
        </div>

        {/* Page Header Row */}
        <div className="mb-10 pb-6 border-b border-gray-200">
          <h1 className="text-3xl font-bold text-[#8B5E3C] mb-2">Shop by Categories</h1>
          <p className="text-sm text-gray-500">Explore our premium collections crafted for sustainable play</p>
        </div>

        {/* Categories Grid Container with margin top style */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 justify-items-center">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="flex flex-col items-center gap-3 w-full">
                  <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gray-200 animate-pulse border border-[#E6DFD4]" />
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                </div>
              ))}
            </div>
          ) : categories.length > 0 ? (
            <motion.div 
              initial="hidden" 
              animate="visible" 
              variants={stagger}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 md:gap-8 justify-items-center"
            >
              {categories.map((c, i) => {
                const imageSrc = c.image?.url || c.image;
                return (
                  <motion.div
                    key={c._id || i}
                    variants={fadeUp}
                    className="flex flex-col items-center gap-3 cursor-pointer group py-2"
                    onClick={() => onNavigate(`/products?category=${c._id}`)}
                  >
                    {/* Rounded rectangle card */}
                    <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-[#FDF6EF] shadow-md group-hover:shadow-xl ring-1 ring-[#E6DFD4] group-hover:ring-[#B0611C] transition-all duration-300">
                      <img
                        src={imageSrc}
                        alt={c.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={e => e.target.src='/wood-placeholder.png'}
                      />
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/30 flex items-end justify-center pb-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <span className="bg-white text-[#B0611C] text-[11px] md:text-xs font-bold px-3 py-1.5 rounded-full shadow-md transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                          Shop Now
                        </span>
                      </div>
                    </div>
                    {/* Label */}
                    <h3 className="font-semibold text-brand-dark text-sm md:text-base text-center leading-tight px-1 group-hover:text-[#B0611C] transition-colors duration-200">
                      {c.name}
                    </h3>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-16 text-gray-500">
              No categories available at the moment.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
