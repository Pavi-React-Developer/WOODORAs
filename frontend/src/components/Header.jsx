import React, { useEffect, useState } from 'react';
import { ChevronDown, Heart, Search, ShoppingCart, User } from 'lucide-react';
import { catalogService } from '../api/catalogService';
import { cmsService } from '../api/cmsService';

export default function Header({
  user,
  onLogout,
  onNavigate,
  cartCount,
  wishlistCount,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const [navItems, setNavItems] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const cats = await catalogService.getCategories();
        setCategories(cats.filter((category) => category.isActive && !category.isDeleted));
      } catch (err) {
        console.error('Failed to load categories for navbar', err);
      }
    };

    const fetchNavbars = async () => {
      try {
        const res = await cmsService.getNavbars();
        if (res.success && res.data) {
          setNavItems(res.data.filter((item) => item.status));
        }
      } catch (err) {
        console.error('Failed to load navbars from CMS', err);
      }
    };

    fetchCategories();
    fetchNavbars();
  }, []);

  const mainCategories = categories.filter((category) => !category.parentCategory);

  const getSubCategories = (parentId) =>
    categories.filter(
      (category) =>
        category.parentCategory === parentId ||
        (category.parentCategory && category.parentCategory._id === parentId),
    );

  return (
    <header className="sticky top-0 z-50 border-b border-[#E9DED3] bg-white/95 shadow-[0_6px_28px_rgba(62,39,35,0.06)] backdrop-blur font-sans">
      <div className="mx-auto flex min-h-[88px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="shrink-0 font-serif text-3xl font-bold tracking-tight text-[#5A2F1F] sm:text-4xl"
        >
          WoodenToys
        </button>

        <nav className="hidden flex-1 items-center justify-center gap-6 xl:flex">
          {navItems.length > 0 ? (
            navItems.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => {
                  if (item.url.startsWith('http')) {
                    window.location.href = item.url;
                  } else {
                    onNavigate(item.url.replace(/^\//, '') || 'home');
                  }
                }}
                className="text-sm font-bold text-[#232027] hover:text-[#8B5E3C]"
              >
                {item.title}
              </button>
            ))
          ) : (
            <>
              <button type="button" onClick={() => onNavigate('/')} className="text-sm font-bold text-[#232027] hover:text-[#8B5E3C]">
                Home
              </button>
              <button type="button" onClick={() => onNavigate('/')} className="text-sm font-bold text-[#232027] hover:text-[#8B5E3C]">
                All Products
              </button>

              <div
                className="relative flex min-h-[88px] items-center"
                onMouseEnter={() => setActiveMenu('byAge')}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <button type="button" className="flex items-center gap-1 text-sm font-bold text-[#232027] hover:text-[#8B5E3C]">
                  By Age <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
                </button>
                {activeMenu === 'byAge' && (
                  <div className="absolute left-0 top-full w-52 rounded-[10px] border border-[#E9DED3] bg-white py-2 shadow-xl">
                    {['0-6 Months', '6-12 Months', '1-2 Years', '2-3 Years', '3+ Years'].map((age) => (
                      <button key={age} onClick={() => onNavigate('/')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#8B5E3C]">
                        {age}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="relative flex min-h-[88px] items-center"
                onMouseEnter={() => setActiveMenu('byCategory')}
                onMouseLeave={() => setActiveMenu(null)}
              >
                <button type="button" className="flex items-center gap-1 text-sm font-bold text-[#232027] hover:text-[#8B5E3C]">
                  By Category <ChevronDown className="h-4 w-4" strokeWidth={1.8} />
                </button>
                {activeMenu === 'byCategory' && (
                  <div className="absolute left-0 top-full w-64 rounded-[10px] border border-[#E9DED3] bg-white py-2 shadow-xl">
                    {mainCategories.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-[#8B827C]">Loading categories...</div>
                    ) : (
                      mainCategories.map((mainCat) => {
                        const subs = getSubCategories(mainCat._id);
                        return (
                          <div key={mainCat._id} className="group relative">
                            <button type="button" onClick={() => onNavigate('/')} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#8B5E3C]">
                              {mainCat.name}
                              {subs.length > 0 && <ChevronDown className="-rotate-90 h-4 w-4" strokeWidth={1.8} />}
                            </button>
                            {subs.length > 0 && (
                              <div className="absolute left-full top-0 hidden w-52 rounded-[10px] border border-[#E9DED3] bg-white py-2 shadow-xl group-hover:block">
                                {subs.map((subCat) => (
                                  <button key={subCat._id} onClick={() => onNavigate('/')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#8B5E3C]">
                                    {subCat.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <button type="button" className="text-sm font-bold text-[#232027] hover:text-[#8B5E3C]">
                Gift Kit & Card
              </button>
              <button type="button" className="text-sm font-bold text-[#232027] hover:text-[#8B5E3C]">
                Loyalty Rewards
              </button>
            </>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-5">
          <label className="hidden w-[220px] items-center gap-2 rounded-[10px] border border-[#E6D9CE] bg-[#FAF4EF] px-3 py-2 text-[#8B5E3C] shadow-inner focus-within:bg-white focus-within:ring-1 focus-within:ring-[#9A6031] lg:flex">
            <Search className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            <input
              type="search"
              placeholder="Search toys..."
              className="w-full bg-transparent text-sm text-[#2E2E2E] outline-none placeholder:text-[#7C7370]"
            />
          </label>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => (user ? setDropdownOpen((open) => !open) : onNavigate('/login'))}
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#EFE6DD] bg-white text-[#A7632E] shadow-sm transition hover:border-[#D9B382] hover:bg-[#FAF4EF]"
              aria-label="Account"
            >
              <User className="h-6 w-6" strokeWidth={1.8} />
            </button>

            {dropdownOpen && user && (
              <div className="absolute right-0 z-50 mt-3 w-56 overflow-hidden rounded-[12px] border border-[#E9DED3] bg-white shadow-xl">
                <div className="border-b border-[#EFE6DD] px-4 py-3">
                  <p className="truncate text-sm font-bold text-[#2E2E2E]">{user.name}</p>
                  <p className="truncate text-xs text-[#7C7370]">{user.email}</p>
                </div>
                {user.role === 'admin' && (
                  <button type="button" onClick={() => { onNavigate('/admin'); setDropdownOpen(false); }} className="block w-full px-4 py-3 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF]">
                    Admin Dashboard
                  </button>
                )}
                <button type="button" onClick={() => { onLogout(); setDropdownOpen(false); }} className="block w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                  Sign Out
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/wishlist')}
            className="relative flex h-12 w-12 items-center justify-center rounded-full text-[#201A17] transition hover:bg-[#FAF4EF]"
            aria-label="Wishlist"
          >
            <Heart className="h-6 w-6" strokeWidth={1.9} />
            {wishlistCount > 0 && (
              <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8B5E3C] px-1 text-[10px] font-bold text-white">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/cart')}
            className="relative flex h-12 w-12 items-center justify-center rounded-full text-[#201A17] transition hover:bg-[#FAF4EF]"
            aria-label="Cart"
          >
            <ShoppingCart className="h-6 w-6" strokeWidth={1.9} />
            {cartCount > 0 && (
              <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#8B5E3C] px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
      </div>
      <div className="border-t border-[#F1E8E0] px-4 py-3 lg:hidden">
        <label className="mx-auto flex max-w-xl items-center gap-3 rounded-[10px] border border-[#E6D9CE] bg-white px-4 py-3 text-[#8B5E3C]">
          <Search className="h-5 w-5" strokeWidth={1.8} />
          <input
            type="search"
            placeholder="Search for toys, gift sets & more..."
            className="w-full bg-transparent text-sm text-[#2E2E2E] outline-none placeholder:text-[#7C7370]"
          />
        </label>
      </div>

      {dropdownOpen && <button type="button" aria-label="Close account menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setDropdownOpen(false)} />}
    </header>
  );
}
