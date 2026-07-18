import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, Heart, Search, ShoppingCart, User, X, Loader2, Menu } from 'lucide-react';
import { catalogService } from '../api/catalogService';
import { cmsService } from '../api/cmsService';
import { productV2API, categoryV2API } from '../api/catalogV2Service';

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
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [categoryResults, setCategoryResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);

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

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setCategoryResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          productV2API.getAll({ search: searchQuery, limit: 4 }),
          categoryV2API.getAll({ search: searchQuery, limit: 3 })
        ]);
        if (prodRes.success && prodRes.products) {
          setSearchResults(prodRes.products);
        }
        if (catRes.success && catRes.categories) {
          setCategoryResults(catRes.categories);
        }
      } catch (err) {
        console.error('Failed to search products/categories', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const mainCategories = categories.filter((category) => !category.parentCategory);

  const getSubCategories = (parentId) =>
    categories.filter(
      (category) =>
        category.parentCategory === parentId ||
        (category.parentCategory && category.parentCategory._id === parentId),
    );

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-[#E9DED3] bg-white/95 shadow-[0_6px_28px_rgba(62,39,35,0.06)] backdrop-blur font-sans">
      <div className="mx-auto flex min-h-[88px] max-w-[1500px] items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            type="button" 
            className="xl:hidden text-[#4A3326] hover:text-[#9C755A]"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" strokeWidth={1.5} />
          </button>
          
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="shrink-0 flex flex-col items-start"
          >
            <span className="font-['Poppins'] text-[24px] sm:text-[40px] font-extrabold tracking-tight text-[#4A3326] leading-none">
              Woodora
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium tracking-wide text-[#6C5B52] mt-1 hidden sm:block">
              Crafted with Love, Made for Play
            </span>
          </button>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-8 xl:flex">
          <button type="button" onClick={() => onNavigate('/')} className="text-[15px] font-medium text-[#9C755A] border-b-2 border-[#9C755A] pb-0.5">
            Home
          </button>
          
          <div
            className="relative flex h-[88px] items-center"
            onMouseEnter={() => setActiveMenu('shop')}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <button type="button" className="flex items-center gap-1 text-[15px] font-medium text-[#4A3326] hover:text-[#9C755A]">
              Shop <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
            </button>
            {activeMenu === 'shop' && (
              <div className="absolute left-0 top-full w-52 rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg">
                <button onClick={() => onNavigate('/shop')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">
                  All Products
                </button>
                <button onClick={() => onNavigate('/shop?sort=newest')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">
                  New Arrivals
                </button>
                <button onClick={() => onNavigate('/shop?sort=bestselling')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">
                  Best Sellers
                </button>
              </div>
            )}
          </div>

          <div
            className="relative flex h-[88px] items-center"
            onMouseEnter={() => setActiveMenu('categories')}
            onMouseLeave={() => setActiveMenu(null)}
          >
            <button type="button" className="flex items-center gap-1 text-[15px] font-medium text-[#4A3326] hover:text-[#9C755A]">
              Categories <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
            </button>
            {activeMenu === 'categories' && (
              <div className="absolute left-0 top-full w-64 rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg">
                {mainCategories.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-[#8B827C]">Loading...</div>
                ) : (
                  mainCategories.map((mainCat) => {
                    const subs = getSubCategories(mainCat._id);
                    return (
                      <div key={mainCat._id} className="group relative">
                        <button type="button" onClick={() => onNavigate(`/shop?category=${mainCat._id}`)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">
                          {mainCat.name}
                          {subs.length > 0 && <ChevronDown className="-rotate-90 h-4 w-4" strokeWidth={1.5} />}
                        </button>
                        {subs.length > 0 && (
                          <div className="absolute left-full top-0 hidden w-52 rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg group-hover:block">
                            {subs.map((subCat) => (
                              <button key={subCat._id} onClick={() => onNavigate(`/shop?category=${subCat._id}`)} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">
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

          <button type="button" onClick={() => onNavigate('/about')} className="text-[15px] font-medium text-[#4A3326] hover:text-[#9C755A]">
            About Us
          </button>
          <button type="button" onClick={() => onNavigate('/blog')} className="text-[15px] font-medium text-[#4A3326] hover:text-[#9C755A]">
            Blog
          </button>
          <button type="button" onClick={() => onNavigate('/contact')} className="text-[15px] font-medium text-[#4A3326] hover:text-[#9C755A]">
            Contact
          </button>
        </nav>

        {/* Animated Search Overlay */}
        <div 
          className={`absolute inset-0 z-10 flex items-center bg-white/95 px-4 sm:px-6 lg:px-10 transition-all duration-300 ease-in-out ${
            isSearchOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible'
          }`}
        >
          <div className="mx-auto flex w-full max-w-3xl items-center gap-4 relative">
            <Search className="h-6 w-6 text-[#9C755A]" strokeWidth={1.5} />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search for toys, categories, or keywords..."
              className="w-full bg-transparent text-lg text-[#4A3326] outline-none placeholder:text-[#A79C97]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSearching && <Loader2 className="h-5 w-5 animate-spin text-[#9C755A]" />}
            <button 
              type="button" 
              onClick={() => {
                setIsSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-2 text-[#4A3326] hover:text-[#9C755A]"
            >
              <X className="h-6 w-6" strokeWidth={1.5} />
            </button>
            
            {/* Search Results Dropdown */}
            {searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-4 bg-white border border-[#E9DED3] rounded-xl shadow-xl overflow-hidden">
                {(searchResults.length > 0 || categoryResults.length > 0) ? (
                  <div className="py-2">
                    
                    {/* Category Results */}
                    {categoryResults.length > 0 && (
                      <div className="mb-2 border-b border-[#E9DED3] pb-2">
                        <p className="px-4 py-1 text-[10px] font-bold text-[#8A817C] uppercase tracking-wider">Categories</p>
                        {categoryResults.map((cat) => (
                          <button 
                            key={`cat-${cat._id}`} 
                            onClick={() => {
                              onNavigate(`/shop?category=${cat._id}`);
                              setIsSearchOpen(false);
                            }}
                            className="flex items-center gap-3 w-full p-3 px-4 hover:bg-[#FAF4EF] transition"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#E9DED3] flex items-center justify-center shrink-0">
                              <Search className="h-4 w-4 text-[#9C755A]" />
                            </div>
                            <div className="text-left flex-1">
                              <p className="text-sm font-bold text-[#4A3326]">{cat.name}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Product Results */}
                    {searchResults.length > 0 && (
                      <div>
                        <p className="px-4 py-1 text-[10px] font-bold text-[#8A817C] uppercase tracking-wider">Products</p>
                        {searchResults.map((product) => (
                          <button 
                            key={product._id} 
                            onClick={() => {
                              onNavigate(`/product/${product.slug || product._id}`);
                              setIsSearchOpen(false);
                            }}
                            className="flex items-center gap-4 w-full p-4 hover:bg-[#FAF4EF] transition"
                          >
                            <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 shrink-0">
                              {product.images && product.images[0] ? (
                                <img src={product.images[0].url || product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-[#E9DED3]" />
                              )}
                            </div>
                            <div className="text-left flex-1">
                              <p className="text-sm font-bold text-[#4A3326] line-clamp-1">{product.name}</p>
                              <p className="text-xs text-[#7C7370]">{product.category?.name || 'Category'}</p>
                            </div>
                            <p className="text-sm font-bold text-[#9C755A]">${product.price}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    <button 
                      onClick={() => {
                         onNavigate(`/search?q=${searchQuery}`);
                         setIsSearchOpen(false);
                      }}
                      className="w-full p-4 text-sm font-bold text-[#9C755A] hover:bg-[#FAF4EF] transition border-t border-[#E9DED3] mt-2"
                    >
                      View All Results
                    </button>
                  </div>
                ) : !isSearching ? (
                  <div className="p-8 text-center text-[#7C7370]">
                    No results found for "{searchQuery}"
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:gap-6 text-[#4A3326] relative z-20">
          <button 
            type="button" 
            className={`transition hover:text-[#9C755A] ${isSearchOpen ? 'hidden md:block opacity-0 pointer-events-none' : 'opacity-100'}`}
            aria-label="Search"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" strokeWidth={1.5} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => (user ? setDropdownOpen((open) => !open) : onNavigate('/login'))}
              className="transition hover:text-[#9C755A]"
              aria-label="Account"
            >
              <User className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" strokeWidth={1.5} />
            </button>

            {dropdownOpen && user && (
              <div className="absolute right-0 top-8 z-[60] mt-2 w-56 overflow-hidden rounded-xl border border-[#E9DED3] bg-white shadow-lg">
                <div className="border-b border-[#EFE6DD] px-4 py-3">
                  <p className="truncate text-sm font-bold text-[#2E2E2E]">{user.name}</p>
                  <p className="truncate text-xs text-[#7C7370]">{user.email}</p>
                </div>
                {user.role === 'admin' && (
                  <button type="button" onClick={() => { onNavigate('/admin'); setDropdownOpen(false); }} className="block w-full px-4 py-3 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF]">
                    Admin Dashboard
                  </button>
                )}
                <button type="button" onClick={() => { onNavigate('/profile'); setDropdownOpen(false); }} className="block w-full px-4 py-3 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF]">
                  My Profile
                </button>
                <button type="button" onClick={() => { onLogout(); setDropdownOpen(false); }} className="block w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50">
                  Sign Out
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/wishlist')}
            className="relative transition hover:text-[#9C755A]"
            aria-label="Wishlist"
          >
            <Heart className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" strokeWidth={1.5} />
            {wishlistCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#9C755A] px-1 text-[9px] font-bold text-white shadow-sm">
                {wishlistCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/cart')}
            className="relative transition hover:text-[#9C755A]"
            aria-label="Cart"
          >
            <ShoppingCart className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#A87C4F] px-1 text-[9px] font-bold text-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>
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
    </header>

      {/* Mobile Menu Drawer (Outside Header to avoid backdrop-filter stacking context) */}
      <div 
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 xl:hidden ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div 
        className={`fixed top-0 left-0 bottom-0 z-[70] w-[80vw] max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-in-out xl:hidden flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#E9DED3]">
          <span className="font-['Poppins'] text-2xl font-extrabold text-[#4A3326]">
            Menu
          </span>
          <button 
            type="button" 
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 -mr-2 text-[#4A3326] hover:text-[#9C755A]"
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-6 space-y-6 pb-12">
          <button type="button" onClick={() => { onNavigate('/'); setIsMobileMenuOpen(false); }} className="block w-full text-left text-lg font-medium text-[#4A3326]">
            Home
          </button>
          
          <div className="space-y-3">
            <p className="text-lg font-medium text-[#4A3326]">Shop</p>
            <div className="pl-4 space-y-3 border-l-2 border-[#E9DED3]">
              {['All Products', 'New Arrivals', 'Best Sellers'].map((item) => (
                <button key={item} onClick={() => { onNavigate('/'); setIsMobileMenuOpen(false); }} type="button" className="block w-full text-left text-[#7C7370]">
                  {item}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-lg font-medium text-[#4A3326]">Categories</p>
            <div className="pl-4 space-y-3 border-l-2 border-[#E9DED3]">
              {mainCategories.map((mainCat) => (
                <button key={mainCat._id} onClick={() => { onNavigate('/'); setIsMobileMenuOpen(false); }} type="button" className="block w-full text-left text-[#7C7370]">
                  {mainCat.name}
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => { onNavigate('/'); setIsMobileMenuOpen(false); }} className="block w-full text-left text-lg font-medium text-[#4A3326]">
            About Us
          </button>
          <button type="button" onClick={() => { onNavigate('/'); setIsMobileMenuOpen(false); }} className="block w-full text-left text-lg font-medium text-[#4A3326]">
            Blog
          </button>
          <button type="button" onClick={() => { onNavigate('/'); setIsMobileMenuOpen(false); }} className="block w-full text-left text-lg font-medium text-[#4A3326]">
            Contact
          </button>
        </div>
      </div>

      {dropdownOpen && <button type="button" aria-label="Close account menu" className="fixed inset-0 z-[40] cursor-default" onClick={() => setDropdownOpen(false)} />}
    </>
  );
}
