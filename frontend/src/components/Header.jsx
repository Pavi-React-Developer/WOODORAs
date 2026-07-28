import React, { useEffect, useState, useRef } from 'react';
import { ChevronDown, Heart, Search, ShoppingCart, User, X, Loader2, Menu, LogOut, Settings } from 'lucide-react';
import { catalogService } from '../api/catalogService';
import { cmsService } from '../api/cmsService';
import { productV2API, categoryV2API } from '../api/catalogV2Service';
import { Link } from 'react-router-dom';

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

    const fetchNavbars = async () => {
      try {
        const res = await cmsService.getNavbar();
        if (res.success && res.data) {
          setNavbarConfig(res.data);
          setNavItems((res.data.items || []).filter((item) => item.status));
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
          <img
            src={navbarConfig?.logo?.url || "/woodora-logo.png"}
            alt="Woodora Logo"
            className="h-10 w-[160px] object-contain scale-125 origin-left"
          />
        </button>

        {/* Wide Persistent Search Bar */}
        <div className="relative flex-1 max-w-2xl mx-auto">
          <div className="flex items-center rounded-lg border border-[#E6D9CE] bg-[#FAF4EF] px-4 py-1.5 gap-3 focus-within:border-[#B0611C] transition-colors">
            <input
              type="text"
              placeholder="Search for wooden toys, games & more..."
              className="flex-1 bg-transparent text-sm text-[#4A3326] outline-none placeholder:text-[#A79C97]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="shrink-0 flex items-center justify-center h-8 w-8 rounded-md bg-[#B0611C] text-white hover:bg-[#9A5218] transition-colors"
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
                        <button key={`cat-${cat._id}`} onClick={() => { onNavigate(`/shop?category=${cat._id}`); setSearchQuery(''); }} className="flex items-center gap-3 w-full p-3 px-4 hover:bg-[#FAF4EF] transition">
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
              className="flex flex-col items-center gap-1 hover:text-[#B0611C] transition-colors"
              aria-label="Account"
            >
              {(user?.profileImage?.url || user?.avatar) ? (
                <img src={user.profileImage?.url || user.avatar} alt={user.name} className="h-[22px] w-[22px] rounded-full object-cover" />
              ) : (
                <User className="h-[22px] w-[22px]" strokeWidth={1.5} />
              )}
              <span className="text-[11px] font-medium leading-none">Account</span>
            </button>
            {dropdownOpen && user && (
              <div className="absolute right-0 top-12 z-[60] mt-2 w-[220px] overflow-hidden rounded-xl border border-[#E9DED3] bg-white shadow-xl">
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
                  <button type="button" onClick={() => { onNavigate('/profile'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] text-[#4A403B] hover:bg-[#FAF4EF] transition-colors">
                    <User className="h-[18px] w-[18px] text-[#6D625C]" />
                    Profile & Dashboard
                  </button>
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
            className="relative flex flex-col items-center gap-1 hover:text-[#B0611C] transition-colors"
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
            className="relative flex flex-col items-center gap-1 hover:text-[#B0611C] transition-colors"
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
        <nav className="mx-auto flex max-w-[1500px] items-center gap-0 px-10">
          {navItems.length > 0 ? (
            [...navItems].sort((a, b) => (a.order || 0) - (b.order || 0)).map((item, idx) => {
              const titleLower = item.title.toLowerCase();
              const navLinkCls = "flex h-[46px] items-center px-4 text-[14px] font-medium whitespace-nowrap border-b-2 border-transparent hover:border-current transition-colors";

              if (titleLower === 'shop' || item.isDropdown) {
                return (
                  <div key={item._id || `nav-${idx}`} className="relative flex h-[46px] items-center" onMouseEnter={() => setActiveMenu(titleLower)} onMouseLeave={() => setActiveMenu(null)}>
                    <button type="button" className={`${navLinkCls} gap-1`} style={{ color: item.textColor || navbarConfig?.textColor || '#B0611C' }}>
                      {item.title} <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    {activeMenu === titleLower && (
                      <div className="absolute left-0 top-full min-w-[208px] rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg z-50">
                        {titleLower === 'shop' ? (<>
                          <button onClick={() => onNavigate('/shop')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">All Products</button>
                          <button onClick={() => onNavigate('/shop?sort=newest')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">New Arrivals</button>
                          <button onClick={() => onNavigate('/shop?sort=bestselling')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">Best Sellers</button>
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

              if (titleLower === 'categories') {
                return (
                  <div key={item._id || `nav-${idx}`} className="relative flex h-[46px] items-center" onMouseEnter={() => setActiveMenu(titleLower)} onMouseLeave={() => setActiveMenu(null)}>
                    <button type="button" onClick={() => onNavigate('/categories')} className={`${navLinkCls} gap-1`} style={{ color: item.textColor || '#B0611C' }}>
                      {item.title} <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                    {activeMenu === titleLower && (
                      <div className="absolute left-0 top-full w-64 rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg z-50">
                        {mainCategories.length === 0 ? (<div className="px-4 py-3 text-sm text-[#8B827C]">Loading...</div>) : (
                          mainCategories.map((mainCat) => {
                            const subs = getSubCategories(mainCat._id);
                            return (
                              <div key={mainCat._id} className="group relative">
                                <button type="button" onClick={() => onNavigate(`/shop?category=${mainCat._id}`)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">
                                  {mainCat.name}{subs.length > 0 && <ChevronDown className="-rotate-90 h-4 w-4" strokeWidth={1.5} />}
                                </button>
                                {subs.length > 0 && (<div className="absolute left-full top-0 hidden w-52 rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg group-hover:block">
                                  {subs.map((subCat) => (<button key={subCat._id} onClick={() => onNavigate(`/shop?category=${subCat._id}`)} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">{subCat.name}</button>))}
                                </div>)}
                              </div>
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
                  <React.Fragment key={item._id || `nav-${idx}`}>
                    <button type="button" onClick={() => onNavigate('/gift-and-card')} className={navLinkCls} style={{ color: item.textColor || navbarConfig?.textColor || '#B0611C' }}>{item.title}</button>
                    <button type="button" onClick={() => onNavigate('/customize')} className={navLinkCls} style={{ color: item.textColor || navbarConfig?.textColor || '#B0611C' }}>Customize</button>
                  </React.Fragment>
                );
              }

              const isExternalItem = item.url && (item.url.startsWith('http://') || item.url.startsWith('https://'));
              if (isExternalItem) return <a key={item._id || `nav-${idx}`} href={item.url} className={navLinkCls} style={{ color: item.textColor || navbarConfig?.textColor || '#B0611C' }}>{item.title}</a>;

              return <Link key={item._id || `nav-${idx}`} to={item.url} className={navLinkCls} style={{ color: item.textColor || navbarConfig?.textColor || '#B0611C' }}>{item.title}</Link>;
            })
          ) : (
            <>
              {[
                { label: 'Home', action: () => onNavigate('/') },
              ].map(({ label, action }) => (
                <button key={label} type="button" onClick={action} className="flex h-[46px] items-center px-4 text-[14px] font-medium border-b-2 border-transparent hover:border-current transition-colors" style={{ color: navbarConfig?.textColor || '#B0611C' }}>{label}</button>
              ))}
              <div className="relative flex h-[46px] items-center" onMouseEnter={() => setActiveMenu('shop')} onMouseLeave={() => setActiveMenu(null)}>
                <button type="button" className="flex h-full items-center gap-1 px-4 text-[14px] font-medium border-b-2 border-transparent hover:border-current transition-colors" style={{ color: navbarConfig?.textColor || '#B0611C' }}>Shop <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
                {activeMenu === 'shop' && (<div className="absolute left-0 top-full w-52 rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg z-50">
                  <button onClick={() => onNavigate('/shop')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">All Products</button>
                  <button onClick={() => onNavigate('/shop?sort=newest')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">New Arrivals</button>
                  <button onClick={() => onNavigate('/shop?sort=bestselling')} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">Best Sellers</button>
                </div>)}
              </div>
              <div className="relative flex h-[46px] items-center" onMouseEnter={() => setActiveMenu('categories')} onMouseLeave={() => setActiveMenu(null)}>
                <button type="button" onClick={() => onNavigate('/categories')} className="flex h-full items-center gap-1 px-4 text-[14px] font-medium border-b-2 border-transparent hover:border-current transition-colors" style={{ color: navbarConfig?.textColor || '#B0611C' }}>Categories <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.5} /></button>
                {activeMenu === 'categories' && (<div className="absolute left-0 top-full w-64 rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg z-50">
                  {mainCategories.length === 0 ? (<div className="px-4 py-3 text-sm text-[#8B827C]">Loading...</div>) : mainCategories.map((mainCat) => {
                    const subs = getSubCategories(mainCat._id);
                    return (<div key={mainCat._id} className="group relative">
                      <button type="button" onClick={() => onNavigate(`/shop?category=${mainCat._id}`)} className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">{mainCat.name}{subs.length > 0 && <ChevronDown className="-rotate-90 h-4 w-4" strokeWidth={1.5} />}</button>
                      {subs.length > 0 && (<div className="absolute left-full top-0 hidden w-52 rounded-xl border border-[#E9DED3] bg-white py-2 shadow-lg group-hover:block">{subs.map((subCat) => (<button key={subCat._id} onClick={() => onNavigate(`/shop?category=${subCat._id}`)} type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[#4A403B] hover:bg-[#FAF4EF] hover:text-[#9C755A]">{subCat.name}</button>))}</div>)}
                    </div>);
                  })}
                </div>)}
              </div>
              {[
                { label: 'Bulk Orders', path: '/bulk-orders' },
                { label: 'Gift & Card', path: '/gift-and-card' },
                { label: 'Customize', path: '/customize' },
              ].map(({ label, path }) => (
                <button key={label} type="button" onClick={() => onNavigate(path)} className="flex h-[46px] items-center px-4 text-[14px] font-medium whitespace-nowrap border-b-2 border-transparent hover:border-current transition-colors" style={{ color: navbarConfig?.textColor || '#B0611C' }}>{label}</button>
              ))}
            </>
          )}
        </nav>
      </div>

      {/* ── MOBILE: Logo + icons + hamburger ── */}
      <div className="flex lg:hidden items-center justify-between gap-2 px-3 py-3 sm:px-6">
        <button type="button" onClick={() => onNavigate(navbarConfig?.logoUrl || '/')} className="shrink-0">
          <img src={navbarConfig?.logo?.url || "/woodora-logo.png"} alt="Woodora Logo" className="h-14 w-auto object-contain" />
        </button>
        <div className="flex items-center gap-3 text-[#B0611C]">
          <div className="relative">
            <button
              type="button"
              onClick={() => (user ? setDropdownOpen((open) => !open) : onNavigate('/login'))}
              className="flex items-center justify-center rounded-full transition hover:opacity-80"
              aria-label="Account"
            >
              {(user?.profileImage?.url || user?.avatar) ? (
                <img src={user.profileImage?.url || user.avatar} alt={user.name} className="h-[22px] w-[22px] rounded-full object-cover" />
              ) : (
                <User className="h-[22px] w-[22px]" strokeWidth={1.5} />
              )}
            </button>
            {dropdownOpen && user && (
              <div className="absolute right-0 top-10 z-[60] mt-2 w-[220px] overflow-hidden rounded-xl border border-[#E9DED3] bg-white shadow-xl">
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
                  <button type="button" onClick={() => { onNavigate('/profile'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] text-[#4A403B] hover:bg-[#FAF4EF] transition-colors">
                    <User className="h-[18px] w-[18px] text-[#6D625C]" />
                    Profile & Dashboard
                  </button>
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
          <button type="button" onClick={() => onOpenWishlist?.()} className="relative" aria-label="Wishlist">
            <Heart className="h-[22px] w-[22px]" strokeWidth={1.5} />
            {wishlistCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#9C755A] px-1 text-[9px] font-bold text-white shadow-sm">{wishlistCount}</span>}
          </button>
          <button type="button" onClick={() => onOpenCart?.()} className="relative" aria-label="Cart">
            <ShoppingCart className="h-[22px] w-[22px]" strokeWidth={1.5} />
            {cartCount > 0 && <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#A87C4F] px-1 text-[9px] font-bold text-white shadow-sm">{cartCount}</span>}
          </button>
          <button type="button" className="transition hover:opacity-80 ml-1 sm:ml-2" aria-label="Open menu" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="h-[24px] w-[24px] sm:h-[26px] sm:w-[26px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="border-t border-[#F1E8E0] px-4 py-3 lg:hidden">
        <label className="mx-auto flex max-w-xl items-center gap-3 rounded-[10px] border border-[#E6D9CE] bg-white px-4 py-3 text-[#8B5E3C]">
          <Search className="h-5 w-5" strokeWidth={1.8} />
          <input
            type="search"
            placeholder="Search for toys, gift sets & more..."
            className="w-full bg-transparent text-sm text-[#2E2E2E] outline-none placeholder:text-[#7C7370]"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </label>
      </div>
    </header>

      {/* Animated Search Overlay (desktop fallback, kept for compatibility) */}
      <div 
        className={`fixed inset-x-0 top-0 z-[55] hidden lg:flex items-center bg-white/95 px-4 sm:px-6 lg:px-10 transition-all duration-300 ease-in-out h-[76px] ${
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

        <div className="flex shrink-0 items-center gap-3 sm:gap-6 text-[#B0611C] relative z-20">
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
              {(user?.profileImage?.url || user?.avatar) ? (
                <img src={user.profileImage?.url || user.avatar} alt={user.name} className="h-[22px] w-[22px] sm:h-[26px] sm:w-[26px] rounded-full object-cover" />
              ) : (
                <User className="h-[20px] w-[20px] sm:h-[22px] sm:w-[22px]" strokeWidth={1.5} />
              )}
            </button>

            {dropdownOpen && user && (
              <div className="absolute right-0 top-12 z-[60] mt-2 w-[220px] overflow-hidden rounded-xl border border-[#E9DED3] bg-white shadow-xl">
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
                  <button type="button" onClick={() => { onNavigate('/profile'); setDropdownOpen(false); }} className="flex w-full items-center gap-3 px-5 py-3 text-left text-[15px] text-[#4A403B] hover:bg-[#FAF4EF] transition-colors">
                    <User className="h-[18px] w-[18px] text-[#6D625C]" />
                    Profile & Dashboard
                  </button>
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
            className="relative transition hover:opacity-80"
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
            className="relative transition hover:opacity-80"
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
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div 
        className={`fixed top-0 left-0 bottom-0 z-[70] w-[80vw] max-w-sm bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
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
                          <button key={subItem} onClick={() => { onNavigate(subItem === 'All Products' ? '/shop' : (subItem === 'New Arrivals' ? '/shop?sort=newest' : '/shop?sort=bestselling')); setIsMobileMenuOpen(false); }} type="button" className="block w-full text-left text-[#7C7370]">
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

              if (titleLower === 'categories') {
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
                      <div className="pl-4 space-y-3 border-l-2 border-[#E9DED3]">
                      {mainCategories.map((mainCat) => (
                        <button key={mainCat._id} onClick={() => { onNavigate(`/shop?category=${mainCat._id}`); setIsMobileMenuOpen(false); }} type="button" className="block w-full text-left text-[#7C7370]">
                          {mainCat.name}
                        </button>
                      ))}
                      </div>
                    )}
                  </div>
                );
              }

              if (titleLower === 'gift & card') {
                return (
                  <React.Fragment key={item._id || `nav-mobile-${idx}`}>
                    <button
                      type="button"
                      onClick={() => { onNavigate('/gift-and-card'); setIsMobileMenuOpen(false); }}
                      className="block w-full text-left py-2 text-base font-medium text-[#4A403B]"
                    >
                      {item.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => { onNavigate('/customize'); setIsMobileMenuOpen(false); }}
                      className="block w-full text-left py-2 text-base font-medium text-[#4A403B]"
                    >
                      Customize
                    </button>
                  </React.Fragment>
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
                    <button key={item} onClick={() => { onNavigate(item === 'All Products' ? '/shop' : (item === 'New Arrivals' ? '/shop?sort=newest' : '/shop?sort=bestselling')); setIsMobileMenuOpen(false); }} type="button" className="block w-full text-left text-[#7C7370]">
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
                    <button key={mainCat._id} onClick={() => { onNavigate(`/shop?category=${mainCat._id}`); setIsMobileMenuOpen(false); }} type="button" className="block w-full text-left text-[#7C7370]">
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

      {dropdownOpen && <button type="button" aria-label="Close account menu" className="fixed inset-0 z-[40] cursor-default" onClick={() => setDropdownOpen(false)} />}
    </>
  );
}
