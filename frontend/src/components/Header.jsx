import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, Heart, Search, ShoppingCart, User, X, Loader2, Menu, LogOut, Settings, Home, Package } from 'lucide-react';
import { catalogService } from '../api/catalogService';
import { cmsService } from '../api/cmsService';
import { productV2API, categoryV2API } from '../api/catalogV2Service';
import { API_ORIGIN } from '../api/apiClient';
import { Link } from 'react-router-dom';
import { getImageSrc } from '../utils/imageUtils';

// Resolve any profile image format to a full URL
const resolveProfileImage = (img) => {
  if (!img) return null;
  // It's an object like { url: '/uploads/...' }
  if (typeof img === 'object' && img.url) {
    img = img.url;
  }
  if (typeof img !== 'string' || img === '[object Object]') return null;
  if (img.startsWith('http') || img.startsWith('data:') || img.startsWith('blob:')) return img;
  if (img.startsWith('/uploads') || img.startsWith('uploads/')) {
    return `${API_ORIGIN}${img.startsWith('/') ? '' : '/'}${img}`;
  }
  return img;
};

export default function Header({
  user,
  onLogout,
  onNavigate,
  cartCount,
  wishlistCount,
  onOpenCart,
  onOpenWishlist,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [activeMenu, setActiveMenu] = useState(null);
  const [navItems, setNavItems] = useState([]);
  const [navbarConfig, setNavbarConfig] = useState(null);
  const [navbarLoading, setNavbarLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMobileMenus, setExpandedMobileMenus] = useState({});
  const toggleMobileMenu = (menuId) => {
    setExpandedMobileMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };
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

    const fetchProducts = async () => {
      try {
        setIsProductsLoading(true);
        const res = await productV2API.getAll({ limit: 500, select: 'name,slug,category' });
        if (res.success && res.products) {
          setAllProducts(res.products);
        }
      } catch (err) {
        console.error('Failed to load products for navbar mega menu', err);
      } finally {
        setIsProductsLoading(false);
      }
    };

    const fetchNavbars = async () => {
      try {
        const res = await cmsService.getNavbar();
        if (res.success && res.data) {
          setNavbarConfig(res.data);
          setNavItems((res.data.items || []).filter((item) => item.status));
          if (res.data.logo) {
            localStorage.setItem('cms_cached_logo', getImageSrc(res.data.logo));
          }
        }
      } catch (err) {
        console.error('Failed to load navbars from CMS', err);
      } finally {
        setNavbarLoading(false);
      }
    };

    fetchCategories();
    fetchProducts();
    fetchNavbars();
  }, []);

  // Reset logo error state whenever navbarConfig updates
  useEffect(() => {
    if (navbarConfig?.logo) {
      setLogoError(false);
    }
  }, [navbarConfig]);

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

  const renderNavItem = (item, idx) => {
    const titleLower = item.title.toLowerCase();
    const navLinkCls = "flex h-[46px] items-center px-4 text-[14px] font-medium whitespace-nowrap border-b-2 border-transparent hover:border-current transition-colors";
    const isCategories = titleLower === 'categories' || titleLower === 'categoeris' || (item.url && item.url.includes('/categories'));

    if (isCategories) {
      return (
        <div key={item._id || `nav-${idx}`} className="relative flex h-[46px] items-center" onMouseEnter={() => setActiveMenu(titleLower)} onMouseLeave={() => setActiveMenu(null)}>
          <button type="button" onClick={() => onNavigate('/categories')} className={`${navLinkCls} gap-1`} style={{ color: item.textColor || '#B1621D' }}>
            {item.title} <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          {activeMenu === titleLower && (
            <div className="absolute left-1/2 -translate-x-[45%] top-full mt-0 w-[950px] max-w-[95vw] rounded-b-2xl rounded-t-sm border border-t-0 border-[#E9DED3] bg-[#FDFCF8] p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] z-50">
              {mainCategories.length === 0 ? (<div className="text-sm text-[#8B827C]">Loading...</div>) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-10">
                  {mainCategories.map((mainCat) => {
                    const subs = getSubCategories(mainCat._id);
                    const subCatIds = subs.map(s => s._id);
                    const catProducts = allProducts.filter(p => {
                      const pCatId = typeof p.category === 'object' ? p.category?._id : p.category;
                      return pCatId === mainCat._id || subCatIds.includes(pCatId);
                    });
                    return (
                      <div key={mainCat._id} className="flex flex-col">
                        <button type="button" onClick={() => onNavigate(`/products?category=${mainCat._id}`)} className="text-left text-[11px] font-bold uppercase tracking-widest text-[#33302E] pb-3 border-b border-[#F0EBE6] mb-5 hover:text-[#9C755A] transition-colors">
                          {mainCat.name}
                        </button>
                        {isProductsLoading ? (
                          <div className="flex flex-col gap-4 mt-2">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="flex items-center gap-3">
                                <div className="w-1 h-1 rounded-full bg-gray-200 animate-pulse"></div>
                                <div className="h-2.5 bg-gray-100 rounded animate-pulse w-3/4"></div>
                              </div>
                            ))}
                          </div>
                        ) : catProducts.length > 0 ? (
                          <ul className="flex flex-col gap-3.5">
                            {catProducts.map((prod) => (
                              <li key={prod._id}>
                                <button type="button" onClick={() => onNavigate(`/product/${prod.slug || prod._id}`)} className="flex items-center text-left text-[13.5px] text-[#78716C] hover:text-[#9C755A] transition-colors group w-full">
                                  <span className="w-[4px] h-[4px] rounded-full bg-[#B4AFA9] group-hover:bg-[#9C755A] mr-3.5 transition-colors shrink-0"></span>
                                  <span className="line-clamp-1 flex-1">{prod.name}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-[12px] text-[#A8A19D] italic">No products available</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (titleLower === 'shop' || item.isDropdown) {
      return (
        <div key={item._id || `nav-${idx}`} className="relative flex h-[46px] items-center" onMouseEnter={() => setActiveMenu(titleLower)} onMouseLeave={() => setActiveMenu(null)}>
          <button type="button" className={`${navLinkCls} gap-1`} style={{ color: item.textColor || navbarConfig?.textColor || '#B1621D' }}>
            {item.title} <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          {activeMenu === titleLower && (
            <div className="absolute left-0 top-full min-w-[208px] rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg z-50">
              {titleLower === 'shop' ? (<>
                <button onClick={() => onNavigate('/products')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">All Products</button>
                <button onClick={() => onNavigate('/products?sort=newest')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">New Arrivals</button>
                <button onClick={() => onNavigate('/products?sort=bestselling')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">Best Sellers</button>
              </>) : (item.subItems?.length > 0 ? item.subItems.map((subItem, sIdx) => {
                const isExt = subItem.url.startsWith('http://') || subItem.url.startsWith('https://');
                if (isExt) return <a key={sIdx} href={subItem.url} className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">{subItem.title}</a>;
                return <button key={sIdx} onClick={() => onNavigate(subItem.url)} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">{subItem.title}</button>;
              }) : null)}
            </div>
          )}
        </div>
      );
    }

    if (titleLower === 'gift & card') {
      return (
        <button key={item._id || `nav-${idx}`} type="button" onClick={() => onNavigate('/gift-and-card')} className={navLinkCls} style={{ color: item.textColor || navbarConfig?.textColor || '#B1621D' }}>{item.title}</button>
      );
    }

    const isExternalItem = item.url && (item.url.startsWith('http://') || item.url.startsWith('https://'));
    if (isExternalItem) return <a key={item._id || `nav-${idx}`} href={item.url} className={navLinkCls} style={{ color: item.textColor || navbarConfig?.textColor || '#B1621D' }}>{item.title}</a>;

    return <Link key={item._id || `nav-${idx}`} to={item.url} className={navLinkCls} style={{ color: item.textColor || navbarConfig?.textColor || '#B1621D' }}>{item.title}</Link>;
  };

  const sortedNavItems = [...navItems].sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <>
      <header
        className="sticky top-0 z-50 border-b border-[#E9DED3] shadow-[0_6px_28px_rgba(62,39,35,0.06)] backdrop-blur font-sans transition-colors duration-300"
        style={{
          backgroundColor: navbarConfig?.backgroundColor || 'rgba(255, 255, 255, 0.95)',
          color: navbarConfig?.textColor || '#4A3326'
        }}
      >
        {/* ── DESKTOP ROW 1: Logo | Wide Search Bar | Icon + Label Buttons ── */}
        <div className="hidden lg:flex mx-auto max-w-[1500px] items-center justify-between gap-6 px-10 py-2">

          {/* Logo */}
          <button
            type="button"
            onClick={() => onNavigate(navbarConfig?.logoUrl || '/')}
            className="shrink-0"
          >
            {!logoError && getImageSrc(navbarConfig?.logo) ? (
              <img
                src={getImageSrc(navbarConfig?.logo)}
                alt="Marakathai Logo"
                className="h-10 w-[160px] object-contain scale-125 origin-left"
                onError={() => setLogoError(true)}
              />
            ) : !navbarLoading ? (
              <div className="h-10 flex items-center text-2xl font-serif font-bold" style={{ color: navbarConfig?.textColor || '#B1621D' }}>
                Marakathai
              </div>
            ) : (
              <div className="h-10 w-[160px]" />
            )}
          </button>

          {/* Wide Persistent Search Bar */}
          <div className="relative flex-1 max-w-2xl mx-auto">
            <div className="flex items-center rounded-lg border border-[#E6D9CE] bg-[#FAF4EF] px-4 py-1.5 gap-3 focus-within:border-[#B1621D] transition-colors">
              <input
                type="text"
                placeholder="Search for wooden toys, games & more..."
                className="flex-1 bg-transparent text-sm text-[#4A3326] outline-none placeholder:text-[#A79C97]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                className="shrink-0 flex items-center justify-center h-8 w-8 rounded-md bg-[#B1621D] text-white hover:bg-[#9A5218] transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>

            {/* Inline Search Results Dropdown */}
            {searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E9DED3] rounded-xl shadow-xl overflow-hidden z-50">
                {(searchResults.length > 0 || categoryResults.length > 0) ? (
                  <div className="py-2">
                    {categoryResults.length > 0 && (
                      <div className="mb-2 border-b border-[#E9DED3] pb-2">
                        <p className="px-4 py-1 text-[10px] font-bold text-[#8A817C] uppercase tracking-wider">Categories</p>
                        {categoryResults.map((cat) => (
                          <button key={`cat-${cat._id}`} onClick={() => { onNavigate(`/products?category=${cat._id}`); setSearchQuery(''); }} className="flex items-center gap-3 w-full p-3 px-4 hover:bg-[#FAF4EF] transition">
                            <div className="w-8 h-8 rounded-full bg-[#E9DED3] flex items-center justify-center shrink-0"><Search className="h-4 w-4 text-[#9C755A]" /></div>
                            <p className="text-sm font-bold text-[#4A3326]">{cat.name}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div>
                        <p className="px-4 py-1 text-[10px] font-bold text-[#8A817C] uppercase tracking-wider">Products</p>
                        {searchResults.map((product) => (
                          <button key={product._id} onClick={() => { onNavigate(`/product/${product.slug || product._id}`); setSearchQuery(''); }} className="flex items-center gap-4 w-full p-4 hover:bg-[#FAF4EF] transition">
                            <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 shrink-0">
                              {product.images && product.images[0] ? (<img src={product.images[0].url || product.images[0]} alt={product.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-[#E9DED3]" />)}
                            </div>
                            <div className="text-left flex-1">
                              <p className="text-sm font-bold text-[#4A3326] line-clamp-1">{product.name}</p>
                              <p className="text-xs text-[#7C7370]">{product.category?.name || 'Category'}</p>
                            </div>
                            <p className="text-sm font-bold text-[#9C755A]">₹{product.price}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={() => { onNavigate(`/search?q=${searchQuery}`); setSearchQuery(''); }} className="w-full p-4 text-sm font-bold text-[#9C755A] hover:bg-[#FAF4EF] transition border-t border-[#E9DED3] mt-2">View All Results</button>
                  </div>
                ) : !isSearching ? (
                  <div className="p-8 text-center text-[#7C7370]">No results found for "{searchQuery}"</div>
                ) : null}
              </div>
            )}
          </div>

          {/* Account / Wishlist / Cart with labels */}
          <div className="flex shrink-0 items-center gap-5" style={{ color: navbarConfig?.textColor || '#4A3326' }}>

            {/* Account */}
            <div className="relative">
              <button
                type="button"
                onClick={() => (user ? setDropdownOpen((open) => !open) : onNavigate('/login'))}
                className="flex flex-col items-center gap-1 hover:text-[#B1621D] transition-colors"
                aria-label="Account"
              >
                {(() => {
                  if (user) {
                    const imgSrc = resolveProfileImage(user?.profileImage) || resolveProfileImage(user?.avatar);
                    if (imgSrc) {
                      return <img src={imgSrc} alt={user.name} className="h-[22px] w-[22px] rounded-full object-cover border border-[#E9DED3]" />;
                    }
                    return (
                      <div className="h-[22px] w-[22px] rounded-full bg-[#B1621D] text-white flex items-center justify-center text-[10px] font-bold uppercase shadow-sm">
                        {user.name ? user.name.charAt(0) : 'U'}
                      </div>
                    );
                  }
                  return <User className="h-[22px] w-[22px]" strokeWidth={1.5} />;
                })()}
                <span className="text-[11px] font-medium leading-none">{user ? user.name.split(' ')[0] : 'Account'}</span>
              </button>
              {dropdownOpen && user && (
                <div className="absolute left-1/2 -translate-x-1/2 top-12 z-[60] mt-2 w-[220px] overflow-hidden rounded-xl border border-[#E9DED3] bg-white shadow-xl">
                  <div className="border-b border-[#EFE6DD] px-5 py-4">
                    <p className="text-xs text-[#7C7370]">Logged in as</p>
                    <p className="truncate text-base font-bold text-[#206945] mt-0.5">{user.name}</p>
                  </div>
                  <div className="py-2">
                    {user.role === 'admin' && (
                      <button type="button" onClick={() => { onNavigate('/admin'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] text-[#4A403B] hover:bg-[#FAF4EF] transition-colors">
                        <Settings className="h-[18px] w-[18px] text-[#6D625C]" />
                        Admin Dashboard
                      </button>
                    )}
                    {user.role !== 'admin' && (
                      <button type="button" onClick={() => { onNavigate('/profile'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] text-[#4A403B] hover:bg-[#FAF4EF] transition-colors">
                        <User className="h-[18px] w-[18px] text-[#6D625C]" />
                        Profile & Dashboard
                      </button>
                    )}
                  </div>
                  <div className="border-t border-[#EFE6DD] py-2">
                    <button type="button" onClick={() => { onLogout(); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] font-semibold text-[#DC2626] hover:bg-red-50 transition-colors">
                      <LogOut className="h-[18px] w-[18px]" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Wishlist */}
            <button
              type="button"
              onClick={() => onOpenWishlist?.()}
              className="relative flex flex-col items-center gap-1 hover:text-[#B1621D] transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="h-[22px] w-[22px]" strokeWidth={1.5} />
              {wishlistCount > 0 && (
                <span className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#9C755A] px-1 text-[9px] font-bold text-white shadow-sm">{wishlistCount}</span>
              )}
              <span className="text-[11px] font-medium leading-none">Wishlist</span>
            </button>

            {/* Cart */}
            <button
              type="button"
              onClick={() => onOpenCart?.()}
              className="relative flex flex-col items-center gap-1 hover:text-[#B1621D] transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="h-[22px] w-[22px]" strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#A87C4F] px-1 text-[9px] font-bold text-white shadow-sm">{cartCount}</span>
              )}
              <span className="text-[11px] font-medium leading-none">Cart</span>
            </button>
          </div>
        </div>

        {/* ── DESKTOP ROW 2: Nav Links ── */}
        <div className="hidden lg:block border-t border-[#F1E8E0]">
          <nav className="mx-auto flex max-w-[1500px] items-center justify-between px-10 w-full relative">
            {navItems.length > 0 ? (
              <>
                <div className="flex items-center flex-1 justify-start">
                  {sortedNavItems.filter(i => !i.position || i.position === 'left').map(renderNavItem)}
                </div>
                <div className="flex items-center justify-center">
                  {sortedNavItems.filter(i => i.position === 'center').map(renderNavItem)}
                </div>
                <div className="flex items-center flex-1 justify-end">
                  {sortedNavItems.filter(i => i.position === 'right').map(renderNavItem)}
                </div>
              </>
            ) : (
              <>
                {[
                  { label: 'Home', action: () => onNavigate('/') },
                ].map(({ label, action }) => (
                  <button key={label} type="button" onClick={action} className="flex h-[46px] items-center px-4 text-[14px] font-medium border-b-2 border-transparent hover:border-current transition-colors" style={{ color: navbarConfig?.textColor || '#B1621D' }}>{label}</button>
                ))}
                <div className="relative flex h-[46px] items-center" onMouseEnter={() => setActiveMenu('shop')} onMouseLeave={() => setActiveMenu(null)}>
                  <button type="button" className="flex h-full items-center gap-1 px-4 text-[14px] font-medium border-b-2 border-transparent hover:border-current transition-colors" style={{ color: navbarConfig?.textColor || '#B1621D' }}>Shop <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
                  {activeMenu === 'shop' && (<div className="absolute left-0 top-full w-52 rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg z-50">
                    <button onClick={() => onNavigate('/products')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">All Products</button>
                    <button onClick={() => onNavigate('/products?sort=newest')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">New Arrivals</button>
                    <button onClick={() => onNavigate('/products?sort=bestselling')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">Best Sellers</button>
                  </div>)}
                </div>
                <div className="relative flex h-[46px] items-center" onMouseEnter={() => setActiveMenu('categories')} onMouseLeave={() => setActiveMenu(null)}>
                  <button type="button" onClick={() => onNavigate('/categories')} className="flex h-full items-center gap-1 px-4 text-[14px] font-medium border-b-2 border-transparent hover:border-current transition-colors" style={{ color: navbarConfig?.textColor || '#B1621D' }}>Categories <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
                  {activeMenu === 'categories' && (<div className="absolute left-0 top-full w-64 rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg z-50">
                    {mainCategories.length === 0 ? (<div className="px-4 py-3 text-sm text-[#8B827C]">Loading...</div>) : mainCategories.map((mainCat) => {
                      const subs = getSubCategories(mainCat._id);
                      return (<div key={mainCat._id} className="group relative">
                        <button type="button" onClick={() => onNavigate(`/products?category=${mainCat._id}`)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">{mainCat.name}{subs.length > 0 && <ChevronDown className="-rotate-90 h-4 w-4" strokeWidth={1.5} />}</button>
                        {subs.length > 0 && (<div className="absolute left-full top-0 hidden w-52 rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg group-hover:block">{subs.map((subCat) => (<button key={subCat._id} onClick={() => onNavigate(`/products?category=${subCat._id}`)} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">{subCat.name}</button>))}</div>)}
                      </div>);
                    })}
                  </div>)}
                </div>
                {[
                  { label: 'Bulk Orders', path: '/bulk-orders' },
                  { label: 'Gift & Card', path: '/gift-and-card' },
                  { label: 'Customize', path: '/customize' },
                ].map(({ label, path }) => (
                  <button key={label} type="button" onClick={() => onNavigate(path)} className="flex h-[46px] items-center px-4 text-[14px] font-medium whitespace-nowrap border-b-2 border-transparent hover:border-current transition-colors" style={{ color: navbarConfig?.textColor || '#B1621D' }}>{label}</button>
                ))}
              </>
            )}
          </nav>
        </div>

        {/* ── MOBILE: Hamburger + Logo + Icons ── */}
        <div className="flex lg:hidden items-center justify-between px-3 py-3 sm:px-6 relative">
          {/* Left: Hamburger */}
          <div className="flex items-center w-1/4">
            <button type="button" className="transition hover:opacity-80 text-[#B1621D]" aria-label="Open menu" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu className="h-[24px] w-[24px] sm:h-[26px] sm:w-[26px]" strokeWidth={1.5} />
            </button>
          </div>

          {/* Center: Logo */}
          <div className="flex justify-center w-2/4">
            <button type="button" onClick={() => onNavigate(navbarConfig?.logoUrl || '/')} className="shrink-0">
              {!logoError && getImageSrc(navbarConfig?.logo) ? (
                <img
                  src={getImageSrc(navbarConfig?.logo)}
                  alt="Marakathai Logo"
                  className="h-12 w-auto object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : !navbarLoading ? (
                <div className="h-12 flex items-center text-xl font-serif font-bold" style={{ color: navbarConfig?.textColor || '#B1621D' }}>
                  Marakathai
                </div>
              ) : (
                <div className="h-12 w-32" />
              )}
            </button>
          </div>

          {/* Right: User + Cart */}
          <div className="flex items-center justify-end gap-4 text-[#B1621D] w-1/4">
            <div className="relative">
              <button
                type="button"
                onClick={() => (user ? setDropdownOpen((open) => !open) : onNavigate('/login'))}
                className="flex items-center justify-center rounded-full transition hover:opacity-80"
                aria-label="Account"
              >
                {(() => {
                  if (user) {
                    const imgSrc = resolveProfileImage(user?.profileImage) || resolveProfileImage(user?.avatar);
                    if (imgSrc) {
                      return <img src={imgSrc} alt={user.name} className="h-[22px] w-[22px] rounded-full object-cover border border-[#E9DED3]" />;
                    }
                    return (
                      <div className="h-[22px] w-[22px] rounded-full bg-[#B1621D] text-white flex items-center justify-center text-[10px] font-bold uppercase shadow-sm">
                        {user.name ? user.name.charAt(0) : 'U'}
                      </div>
                    );
                  }
                  return <User className="h-[22px] w-[22px]" strokeWidth={1.5} />;
                })()}
              </button>
              {dropdownOpen && user && (
                <div className="absolute right-0 top-full z-[60] mt-3 w-[220px] overflow-hidden rounded-xl border border-[#E9DED3] bg-white shadow-xl">
                  <div className="border-b border-[#EFE6DD] px-5 py-4">
                    <p className="text-xs text-[#7C7370]">Logged in as</p>
                    <p className="truncate text-base font-bold text-[#206945] mt-0.5">{user.name}</p>
                  </div>
                  <div className="py-2">
                    {user.role === 'admin' && (
                      <button type="button" onClick={() => { onNavigate('/admin'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] text-[#4A403B] hover:bg-[#FAF4EF] transition-colors">
                        <Settings className="h-[18px] w-[18px] text-[#6D625C]" />
                        Admin Dashboard
                      </button>
                    )}
                    {user.role !== 'admin' && (
                      <button type="button" onClick={() => { onNavigate('/profile'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] text-[#4A403B] hover:bg-[#FAF4EF] transition-colors">
                        <User className="h-[18px] w-[18px] text-[#6D625C]" />
                        Profile & Dashboard
                      </button>
                    )}
                  </div>
                  <div className="border-t border-[#EFE6DD] py-2">
                    <button type="button" onClick={() => { onLogout(); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] font-semibold text-[#DC2626] hover:bg-red-50 transition-colors">
                      <LogOut className="h-[18px] w-[18px]" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="border-t border-[#F1E8E0] px-4 py-3 lg:hidden">
          <div className="relative mx-auto max-w-xl">
            <label className="flex items-center gap-3 rounded-[10px] border border-[#E6D9CE] bg-white px-4 py-3 text-[#8B5E3C] focus-within:border-[#B1621D] transition-colors">
              <Search className="h-5 w-5" strokeWidth={1.8} />
              <input
                type="search"
                placeholder="Search for toys, gift sets & more..."
                className="w-full bg-transparent text-sm text-[#2E2E2E] outline-none placeholder:text-[#7C7370]"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    onNavigate(`/search?q=${searchQuery}`);
                    setSearchQuery('');
                    setIsSearchOpen(false);
                  }
                }}
              />
              {searchQuery.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-[#8A817C] hover:text-[#B1621D]"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              )}
            </label>

            {/* Inline Search Results Dropdown for Mobile */}
            {searchQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E9DED3] rounded-xl shadow-xl overflow-hidden z-50">
                {(searchResults.length > 0 || categoryResults.length > 0) ? (
                  <div className="py-2 max-h-[60vh] overflow-y-auto">
                    {categoryResults.length > 0 && (
                      <div className="mb-2 border-b border-[#E9DED3] pb-2">
                        <p className="px-4 py-1 text-[10px] font-bold text-[#8A817C] uppercase tracking-wider">Categories</p>
                        {categoryResults.map((cat) => (
                          <button key={`m-cat-${cat._id}`} onClick={() => { onNavigate(`/products?category=${cat._id}`); setSearchQuery(''); }} className="flex items-center gap-3 w-full p-3 px-4 hover:bg-[#FAF4EF] transition">
                            <div className="w-8 h-8 rounded-full bg-[#E9DED3] flex items-center justify-center shrink-0"><Search className="h-4 w-4 text-[#9C755A]" /></div>
                            <p className="text-sm font-bold text-[#4A3326]">{cat.name}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div>
                        <p className="px-4 py-1 text-[10px] font-bold text-[#8A817C] uppercase tracking-wider">Products</p>
                        {searchResults.map((product) => (
                          <button key={`m-${product._id}`} onClick={() => { onNavigate(`/product/${product.slug || product._id}`); setSearchQuery(''); }} className="flex items-center gap-4 w-full p-4 hover:bg-[#FAF4EF] transition">
                            <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 shrink-0">
                              {product.images && product.images[0] ? (<img src={product.images[0].url || product.images[0]} alt={product.name} className="w-full h-full object-cover" />) : (<div className="w-full h-full bg-[#E9DED3]" />)}
                            </div>
                            <div className="text-left flex-1">
                              <p className="text-sm font-bold text-[#4A3326] line-clamp-1">{product.name}</p>
                              <p className="text-xs text-[#7C7370]">{product.category?.name || 'Category'}</p>
                            </div>
                            <p className="text-sm font-bold text-[#9C755A]">₹{product.price}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <button onClick={() => { onNavigate(`/search?q=${searchQuery}`); setSearchQuery(''); }} className="w-full p-4 text-sm font-bold text-[#9C755A] hover:bg-[#FAF4EF] transition border-t border-[#E9DED3] mt-2">View All Results</button>
                  </div>
                ) : !isSearching ? (
                  <div className="p-8 text-center text-[#7C7370]">No results found for "{searchQuery}"</div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Animated Search Overlay (desktop fallback, kept for compatibility) */}
      <div
        className={`fixed inset-x-0 top-0 z-[55] hidden lg:flex items-center bg-white/95 px-4 sm:px-6 lg:px-10 transition-all duration-300 ease-in-out h-[76px] ${isSearchOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible'
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
                            onNavigate(`/products?category=${cat._id}`);
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

        <div className="flex shrink-0 items-center gap-3 sm:gap-6 text-[#B1621D] relative z-20">
          <button
            type="button"
            className={`transition hover:opacity-80 hidden sm:block ${isSearchOpen ? 'md:block opacity-0 pointer-events-none' : 'opacity-100'}`}
            aria-label="Search"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" strokeWidth={1.5} />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => (user ? setDropdownOpen((open) => !open) : onNavigate('/login'))}
              className="transition hover:opacity-80 flex items-center justify-center rounded-full"
              aria-label="Account"
            >
              {(() => {
                if (user) {
                  const imgSrc = resolveProfileImage(user?.profileImage) || resolveProfileImage(user?.avatar);
                  if (imgSrc) {
                    return <img src={imgSrc} alt={user.name} className="h-[22px] w-[22px] sm:h-[26px] sm:w-[26px] rounded-full object-cover border border-[#E9DED3]" />;
                  }
                  return (
                    <div className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px] rounded-full bg-[#B1621D] text-white flex items-center justify-center text-[10px] font-bold uppercase shadow-sm">
                      {user.name ? user.name.charAt(0) : 'U'}
                    </div>
                  );
                }
                return <User className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" strokeWidth={1.5} />;
              })()}
            </button>

            {dropdownOpen && user && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full z-[60] mt-3 w-[220px] overflow-hidden rounded-xl border border-[#E9DED3] bg-white shadow-xl">
                <div className="border-b border-[#EFE6DD] px-5 py-4">
                  <p className="text-xs text-[#7C7370]">Logged in as</p>
                  <p className="truncate text-base font-bold text-[#206945] mt-0.5">{user.name}</p>
                </div>
                <div className="py-2">
                  {user.role === 'admin' && (
                    <button type="button" onClick={() => { onNavigate('/admin'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] text-[#4A403B] hover:bg-[#FAF4EF] transition-colors">
                      <Settings className="h-[18px] w-[18px] text-[#6D625C]" />
                      Admin Dashboard
                    </button>
                  )}
                  {user.role !== 'admin' && (
                    <button type="button" onClick={() => { onNavigate('/profile'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] text-[#4A403B] hover:bg-[#FAF4EF] transition-colors">
                      <User className="h-[18px] w-[18px] text-[#6D625C]" />
                      Profile & Dashboard
                    </button>
                  )}
                </div>
                <div className="border-t border-[#EFE6DD] py-2">
                  <button type="button" onClick={() => { onLogout(); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] font-semibold text-[#DC2626] hover:bg-red-50 transition-colors">
                    <LogOut className="h-[18px] w-[18px]" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenWishlist?.()}
            className="relative transition hover:opacity-80 hidden lg:block"
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
            onClick={() => onOpenCart?.()}
            className="relative transition hover:opacity-80 hidden lg:block"
            aria-label="Cart"
          >
            <ShoppingCart className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" strokeWidth={1.5} />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#A87C4F] px-1 text-[9px] font-bold text-white shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            className="lg:hidden transition hover:opacity-80 ml-1 sm:ml-2"
            aria-label="Open menu"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-[24px] w-[24px] sm:h-[26px] sm:w-[26px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer (Outside Header to avoid backdrop-filter stacking context) */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
          }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div
        className={`fixed top-0 left-0 bottom-0 z-[70] w-[80vw] max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#E9DED3]">
          <span className="font-['Poppins'] text-2xl font-extrabold text-[#B1621D]">
            Menu
          </span>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 -mr-2 text-[#B1621D] hover:text-[#9C755A]"
          >
            <X className="h-6 w-6" strokeWidth={1.5} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-6 space-y-6 pb-12">
          {navItems.length > 0 ? (
            [...navItems].sort((a, b) => (a.order || 0) - (b.order || 0)).map((item, idx) => {
              const titleLower = item.title.toLowerCase();

              const isCategories = titleLower === 'categories' || titleLower === 'categoeris' || (item.url && item.url.includes('/categories'));

              if (isCategories) {
                const menuId = item._id || `mobile-nav-${idx}`;
                return (
                  <div key={menuId} className="space-y-3">
                    <div className="flex w-full items-center justify-between text-base font-bold text-[#B1621D]">
                      <button type="button" onClick={() => { onNavigate('/categories'); setIsMobileMenuOpen(false); }} className="flex-1 text-left">
                        {item.title}
                      </button>
                      <button type="button" onClick={() => toggleMobileMenu(menuId)} className="p-2">
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expandedMobileMenus[menuId] ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    {expandedMobileMenus[menuId] && (
                      <div className="pl-4 space-y-4">
                        {mainCategories.map((mainCat) => {
                          const subs = getSubCategories(mainCat._id);
                          const subCatIds = subs.map(s => s._id);
                          const catProducts = allProducts.filter(p => {
                            const pCatId = typeof p.category === 'object' ? p.category?._id : p.category;
                            return pCatId === mainCat._id || subCatIds.includes(pCatId);
                          });
                          return (
                            <div key={mainCat._id} className="space-y-2">
                              <div className="flex w-full items-center justify-between group">
                                <button onClick={() => { onNavigate(`/products?category=${mainCat._id}`); setIsMobileMenuOpen(false); }} type="button" className="flex-1 text-left text-[13px] text-[#33302E] uppercase font-bold tracking-wider hover:text-[#9C755A] active:text-[#9C755A] transition-colors">
                                  {mainCat.name}
                                </button>
                                {catProducts.length > 0 && (
                                  <button type="button" onClick={() => toggleMobileMenu(mainCat._id)} className="p-2 text-[#4A403B] hover:text-[#9C755A] active:text-[#9C755A] transition-colors">
                                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expandedMobileMenus[mainCat._id] ? 'rotate-180' : ''}`} />
                                  </button>
                                )}
                              </div>
                              {catProducts.length > 0 && expandedMobileMenus[mainCat._id] && (
                                <div className="pl-3 space-y-3 pt-1 ml-1 pb-1">
                                  {catProducts.map((prod) => (
                                    <button key={prod._id} onClick={() => { onNavigate(`/product/${prod.slug || prod._id}`); setIsMobileMenuOpen(false); }} type="button" className="flex items-center text-left text-[14px] text-[#78716C] hover:text-[#9C755A] active:text-[#9C755A] transition-colors group w-full">
                                      <span className="w-[4px] h-[4px] rounded-full bg-[#B4AFA9] group-hover:bg-[#9C755A] group-active:bg-[#9C755A] mr-3 shrink-0 transition-colors"></span>
                                      <span className="line-clamp-1 flex-1">{prod.name}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              if (titleLower === 'shop' || item.isDropdown) {
                const menuId = item._id || `mobile-nav-${idx}`;
                return (
                  <div key={menuId} className="space-y-3">
                    <button type="button" onClick={() => toggleMobileMenu(menuId)} className="flex w-full items-center justify-between text-base font-bold text-[#B1621D]">
                      <span>{item.title}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expandedMobileMenus[menuId] ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedMobileMenus[menuId] && (
                      <div className="pl-4 space-y-3 border-l-2 border-[#E9DED3]">
                        {titleLower === 'shop' ? (
                          ['All Products', 'New Arrivals', 'Best Sellers'].map((subItem) => (
                            <button key={subItem} onClick={() => { onNavigate(subItem === 'All Products' ? '/products' : (subItem === 'New Arrivals' ? '/products?sort=newest' : '/products?sort=bestselling')); setIsMobileMenuOpen(false); }} type="button" className="block w-full text-left text-[#7C7370]">
                              {subItem}
                            </button>
                          ))
                        ) : (
                          item.subItems?.map((subItem, sIdx) => {
                            const isExt = subItem.url.startsWith('http://') || subItem.url.startsWith('https://');
                            return (
                              <button
                                key={sIdx}
                                onClick={() => {
                                  if (isExt) window.location.href = subItem.url;
                                  else onNavigate(subItem.url);
                                  setIsMobileMenuOpen(false);
                                }}
                                type="button"
                                className="block w-full text-left text-[#7C7370]"
                              >
                                {subItem.title}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              if (titleLower === 'gift & card') {
                return (
                  <button
                    key={item._id || `nav-mobile-${idx}`}
                    type="button"
                    onClick={() => { onNavigate('/gift-and-card'); setIsMobileMenuOpen(false); }}
                    className="block w-full text-left text-base font-bold text-[#B1621D]"
                  >
                    {item.title}
                  </button>
                );
              }

              return (
                <button
                  key={item._id || `mobile-nav-${idx}`}
                  type="button"
                  onClick={() => {
                    if (item.url && item.url.startsWith('http')) {
                      window.location.href = item.url;
                    } else if (item.url) {
                      onNavigate(item.url);
                    }
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left text-base font-bold text-[#B1621D]"
                >
                  {item.title}
                </button>
              );
            })
          ) : (
            <>
              <button type="button" onClick={() => { onNavigate('/'); setIsMobileMenuOpen(false); }} className="block w-full text-left text-base font-bold text-[#B1621D]">
                Home
              </button>

              <div className="space-y-3">
                <button type="button" onClick={() => toggleMobileMenu('static-shop')} className="flex w-full items-center justify-between text-base font-bold text-[#B1621D]">
                  <span>Shop</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expandedMobileMenus['static-shop'] ? 'rotate-180' : ''}`} />
                </button>
                {expandedMobileMenus['static-shop'] && (
                  <div className="pl-4 space-y-3 border-l-2 border-[#E9DED3]">
                    {['All Products', 'New Arrivals', 'Best Sellers'].map((item) => (
                      <button key={item} onClick={() => { onNavigate(item === 'All Products' ? '/products' : (item === 'New Arrivals' ? '/products?sort=newest' : '/products?sort=bestselling')); setIsMobileMenuOpen(false); }} type="button" className="block w-full text-left text-[#7C7370]">
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex w-full items-center justify-between text-base font-bold text-[#B1621D]">
                  <button type="button" onClick={() => { onNavigate('/categories'); setIsMobileMenuOpen(false); }} className="flex-1 text-left">
                    Categories
                  </button>
                  <button type="button" onClick={() => toggleMobileMenu('static-categories')} className="p-2">
                    <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${expandedMobileMenus['static-categories'] ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {expandedMobileMenus['static-categories'] && (
                  <div className="pl-4 space-y-3 border-l-2 border-[#E9DED3]">
                    {mainCategories.map((mainCat) => (
                      <button key={mainCat._id} onClick={() => { onNavigate(`/products?category=${mainCat._id}`); setIsMobileMenuOpen(false); }} type="button" className="block w-full text-left text-[#7C7370]">
                        {mainCat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>


              <button type="button" onClick={() => { onNavigate('/bulk-orders'); setIsMobileMenuOpen(false); }} className="block w-full text-left text-base font-bold text-[#B1621D]">
                Bulk Orders
              </button>
              <button type="button" onClick={() => { onNavigate('/gift-and-card'); setIsMobileMenuOpen(false); }} className="block w-full text-left text-base font-bold text-[#B1621D]">
                Gift & Card
              </button>
              <button type="button" onClick={() => { onNavigate('/customize'); setIsMobileMenuOpen(false); }} className="block w-full text-left text-base font-bold text-[#B1621D]">
                Customize
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── FIXED BOTTOM NAVBAR (MOBILE) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around bg-white px-2 py-3 border-t border-[#E9DED3] lg:hidden pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <button type="button" onClick={() => onNavigate('/')} className="flex flex-col items-center gap-1 text-[#b1621d] transition-colors">
          <Home className="h-[22px] w-[22px]" strokeWidth={1.8} />
          <span className="text-[10px] font-semibold tracking-wide">Home</span>
        </button>
        <button type="button" onClick={() => onNavigate('/profile/order-history')} className="flex flex-col items-center gap-1 text-[#b1621d] transition-colors">
          <Package className="h-[22px] w-[22px]" strokeWidth={1.8} />
          <span className="text-[10px] font-semibold tracking-wide">Orders</span>
        </button>
        <button type="button" onClick={() => onOpenWishlist?.()} className="flex flex-col items-center gap-1 text-[#b1621d] transition-colors relative">
          <Heart className="h-[22px] w-[22px]" strokeWidth={1.8} />
          <span className="text-[10px] font-semibold tracking-wide">Wishlist</span>
          {wishlistCount > 0 && <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#b1621d] px-1 text-[9px] font-bold text-white shadow-sm">{wishlistCount}</span>}
        </button>
        <button type="button" onClick={() => onOpenCart?.()} className="flex flex-col items-center gap-1 text-[#b1621d] transition-colors relative">
          <ShoppingCart className="h-[22px] w-[22px]" strokeWidth={1.8} />
          <span className="text-[10px] font-semibold tracking-wide">Cart</span>
          {cartCount > 0 && <span className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#b1621d] px-1 text-[9px] font-bold text-white shadow-sm">{cartCount}</span>}
        </button>
      </div>


      {dropdownOpen && <button type="button" aria-label="Close account menu" className="fixed inset-0 z-[40] cursor-default" onClick={() => setDropdownOpen(false)} />}
    </>
  );
}
