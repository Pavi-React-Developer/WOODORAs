import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { catalogService } from '../api/catalogService';
import { adminService } from '../api/adminService';
import CategoriesPage from './admin/catalog/CategoriesPage';
import SubCategoriesPage from './admin/catalog/SubCategoriesPage';
import AttributesPage from './admin/catalog/AttributesPage';
import ProductsPage from './admin/catalog/ProductsPage';
import StaffListPage from './admin/StaffListPage';
import AddStaffPage from './admin/AddStaffPage';
import RoleAssignPage from './admin/RoleAssignPage';
import OrdersPage from './admin/OrdersPage';
import { staffAPI } from '../api/staffService';
import FeeListPage from './admin/fees/FeeListPage';
import AddFeePage from './admin/fees/AddFeePage';
import CancellationManagementPage from './admin/cancellations/CancellationManagementPage';
import RefundManagementPage from './admin/refunds/RefundManagementPage';
import InventoryManagement from './admin/inventory/InventoryManagement';

export default function AdminDashboard({ user, onNavigate, onLogout }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard' | 'catalog' | 'products'
  const [catalogSubTab, setCatalogSubTab] = useState('categories'); // 'categories' | 'subcategories' | etc.
  const [productSubTab, setProductSubTab] = useState('list'); // 'list' | 'add'
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [categorySubTab, setCategorySubTab] = useState('list'); // 'list' | 'add' | 'edit'
  const [subCategorySubTab, setSubCategorySubTab] = useState('list'); // 'list' | 'add'

  // Staff Management state
  const [staffSubTab, setStaffSubTab] = useState('list'); // 'list' | 'add' | 'role-assign'
  const [editingStaff, setEditingStaff] = useState(null);
  const [roleAssignStaff, setRoleAssignStaff] = useState(null);
  const [staffMenuOpen, setStaffMenuOpen] = useState(false);
  const [catalogMenuOpen, setCatalogMenuOpen] = useState(true);

  // Fee Management state
  const [feeSubTab, setFeeSubTab] = useState('list'); // 'list' | 'add'
  const [editingFee, setEditingFee] = useState(null);
  const [feeMenuOpen, setFeeMenuOpen] = useState(false);

  // Refund Management state
  const [refundSubTab, setRefundSubTab] = useState('list'); // 'list' | 'analytics' | 'settings'
  const [refundMenuOpen, setRefundMenuOpen] = useState(false);

  // Inventory Management state
  const [inventoryMenuOpen, setInventoryMenuOpen] = useState(false);

  // Dynamic permissions for sidebar
  const [userPermissions, setUserPermissions] = useState(null); // null = not loaded yet

  // Admin users see everything; staff see only their permitted modules
  const isAdmin = user?.role?.toLowerCase() === 'admin';
  const canView = (moduleKey) => {
    if (isAdmin) return true;
    if (!userPermissions) return false;
    const perm = userPermissions.find(p => p.module === moduleKey);
    return !!perm?.view;
  };

  const hasPermission = (moduleKey, action) => {
    if (isAdmin) return true;
    if (!userPermissions) return false;
    const perm = userPermissions.find(p => p.module === moduleKey);
    return !!perm?.[action];
  };

  const canAccessCatalog = canView('catalog');
  const canAccessDashboard = canView('dashboard');
  const canAccessStaff = canView('staff_management');

  // Form Fields for Add/Edit Category
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [catName, setCatName] = useState('');
  const [catImage, setCatImage] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catDisplayOrder, setCatDisplayOrder] = useState('1');
  const [catIsActive, setCatIsActive] = useState(true);
  const [catSeoTitle, setCatSeoTitle] = useState('');
  const [catSeoDescription, setCatSeoDescription] = useState('');
  const [catBrand, setCatBrand] = useState('');
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');
  const [catSubCategoryName, setCatSubCategoryName] = useState('');
  const [catAttribute, setCatAttribute] = useState('');

  // Stats
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [revenueAnalytics, setRevenueAnalytics] = useState([]);
  const [orderVolume, setOrderVolume] = useState([]);

  // Form Fields for Add Product
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [sku, setSku] = useState('');
  const [stock, setStock] = useState('10');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [selectedAgeGroups, setSelectedAgeGroups] = useState([]);
  const [selectedToyTypes, setSelectedToyTypes] = useState([]);
  const [selectedWoodType, setSelectedWoodType] = useState('Beech Wood');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedThemes, setSelectedThemes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [tempPhotoUrl, setTempPhotoUrl] = useState('');

  // Classification Options
  const ageGroupOptions = ['0–2 Years', '2–4 Years', '4–6 Years', '6+ Years'];
  const toyTypeOptions = ['Educational', 'Montessori', 'Building & Stacking', 'Pretend Play', 'Sensory'];
  const woodTypeOptions = ['Beech Wood', 'Pine Wood', 'Oak Wood', 'Maple Wood', 'Rubberwood', 'Birch Wood'];
  const skillDevelopmentOptions = ['Problem Solving', 'Hand-Eye Coordination', 'Fine Motor Skills', 'Spatial Awareness', 'Creativity'];
  const themeOptions = ['Animals', 'Vehicles', 'Nature', 'Geometric Shapes', 'Alphabet & Numbers'];


  // Loading & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = () => {
    // Fetch products
    catalogService.getProducts()
      .then(data => {
        if (data) {
          setProducts(data);
        }
      })
      .catch(err => console.error("Failed to load products in admin", err));

    // Fetch categories
    catalogService.getCategories()
      .then(data => {
        if (data) {
          setCategories(data);
          const topLevel = data.filter(c => !c.parentCategory);
          if (topLevel.length > 0 && !selectedCategory) {
            setSelectedCategory(topLevel[0]._id);
          }
        }
      })
      .catch(err => console.error("Failed to load categories in admin", err));
    // Fetch dashboard stats
    adminService.getDashboardStats()
      .then(data => {
        if (data) {
          setTotalRevenue(data.totalRevenue || 0);
          setTotalOrders(data.totalOrders || 0);
          setTotalCustomers(data.totalCustomers || 0);
          setTotalProducts(data.totalProducts || 0);
          setRevenueAnalytics(data.revenueAnalytics || []);
          setOrderVolume(data.orderVolume || []);
        }
      })
      .catch(err => console.error("Failed to load dashboard stats", err));
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load the current logged-in staff member's permissions dynamically
  useEffect(() => {
    if (!isAdmin && user?.id) {
      staffAPI.getById(user.id)
        .then(data => setUserPermissions(data.staff?.permissions || []))
        .catch(() => setUserPermissions([]));
    }
  }, [user?.id, isAdmin]);

  // Auto-route to the first permitted module if dashboard access is denied
  useEffect(() => {
    if (isAdmin || userPermissions !== null) {
      if (currentTab === 'dashboard' && !canAccessDashboard) {
        if (canView('catalog')) setCurrentTab('v2-categories');
        else if (canView('orders')) setCurrentTab('orders');
        else if (canView('fees')) setCurrentTab('fees');
        else if (canView('staff_management')) setCurrentTab('staff');
      }
    }
  }, [isAdmin, userPermissions, currentTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update selected subcategory option when main category changes
  useEffect(() => {
    const subcats = categories.filter(c => c.parentCategory && (c.parentCategory._id === selectedCategory || c.parentCategory === selectedCategory));
    if (subcats.length > 0) {
      setSelectedSubCategory(subcats[0]._id);
    } else {
      setSelectedSubCategory('');
    }
  }, [selectedCategory, categories]);

  // Handle local image file upload & convert to Base64
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = null;
  };

  // Add photo via URL
  const handleAddPhotoUrl = () => {
    if (tempPhotoUrl.trim()) {
      setPhotos(prev => [...prev, tempPhotoUrl.trim()]);
      setTempPhotoUrl('');
    }
  };

  // Move photo position (left/right reordering)
  const movePhoto = (index, direction) => {
    const newPhotos = [...photos];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < photos.length) {
      const temp = newPhotos[index];
      newPhotos[index] = newPhotos[targetIndex];
      newPhotos[targetIndex] = temp;
      setPhotos(newPhotos);
    }
  };

  // Delete photo
  const deletePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Helper to toggle checkbox values
  const toggleSelection = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter(item => item !== value));
    } else {
      setList([...list, value]);
    }
  };


  // Full Category Management Handlers
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const payload = {
        name: catName.trim(),
        slug,
        description: catDescription.trim(),
        image: catImage.trim(),
        displayOrder: parseInt(catDisplayOrder, 10) || 1,
        isActive: catIsActive,
        seoTitle: catSeoTitle.trim(),
        seoDescription: catSeoDescription.trim()
      };

      if (editCategoryId) {
        await catalogService.updateCategory(editCategoryId, payload);
        setSuccessMsg('Category updated successfully!');
      } else {
        const created = await fetch('http://localhost:5000/api/catalog/category', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        });
        if (!created.ok) {
          const data = await created.json();
          throw new Error(data.message || 'Failed to create category');
        }
        setSuccessMsg('Category created successfully!');
      }

      // Reload categories list
      const cats = await catalogService.getCategories();
      setCategories(cats);
      
      // Reset form and switch tab
      setCatName('');
      setCatDescription('');
      setCatImage('');
      setCatDisplayOrder('1');
      setCatIsActive(true);
      setCatSeoTitle('');
      setCatSeoDescription('');
      setEditCategoryId(null);
      
      setTimeout(() => {
        setCategorySubTab('list');
        setSuccessMsg('');
      }, 1500);

    } catch (err) {
      setErrorMsg(err.message || 'Could not save category');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCategoryClick = (category) => {
    setEditCategoryId(category._id);
    setCatName(category.name || '');
    setCatDescription(category.description || '');
    setCatImage(category.image || '');
    setCatDisplayOrder((category.displayOrder || 1).toString());
    setCatIsActive(category.isActive !== false); // default true if undefined
    setCatSeoTitle(category.seoTitle || '');
    setCatSeoDescription(category.seoDescription || '');
    setCategorySubTab('edit');
  };

  const handleDeleteCategory = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        await catalogService.deleteCategory(id);
        setCategories(prev => prev.filter(c => c._id !== id));
      } catch (err) {
        alert(err.message || 'Could not delete category.');
      }
    }
  };

  // Create Product Submit handler
  const handleAddProductSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedCategory) {
      setErrorMsg('Please select or create a category first.');
      return;
    }

    setIsLoading(true);

    try {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      
      // 1. Create the Product with new classification fields
      const productPayload = {
        name,
        slug,
        description,
        category: selectedCategory,
        subCategory: selectedSubCategory || null,
        price: parseFloat(price),
        images: photos,
        ageGroup: selectedAgeGroups,
        toyType: selectedToyTypes,
        woodType: selectedWoodType,
        skillDevelopment: selectedSkills,
        theme: selectedThemes,
        isActive: true
      };

      const product = await catalogService.createProduct(productPayload);

      // 2. Initialize inventory for the product
      const inventoryPayload = {
        product: product._id,
        sku: sku.trim() || `WOOD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        stockQuantity: parseInt(stock, 10) || 0
      };

      await catalogService.createInventory(inventoryPayload);

      setSuccessMsg('Product and inventory created successfully!');
      
      // Reset form fields
      setName('');
      setDescription('');
      setPrice('');
      setSku('');
      setStock('10');
      setPhotos([]);
      setSelectedAgeGroups([]);
      setSelectedToyTypes([]);
      setSelectedWoodType('Beech Wood');
      setSelectedSkills([]);
      setSelectedThemes([]);

      // Reload products list
      loadData();
      
      // Switch back to list view
      setTimeout(() => {
        setProductSubTab('list');
        setSuccessMsg('');
      }, 1500);

    } catch (err) {
      setErrorMsg(err.message || 'Something went wrong while creating the product.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete product handler
  const handleDeleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await catalogService.deleteProduct(id);
        setProducts(prev => prev.filter(p => p._id !== id));
      } catch (err) {
        alert(err.message || 'Could not delete product.');
      }
    }
  };

  const handleQuickCreateCategory = async (e) => {
    e.preventDefault();
    if (!quickCategoryName.trim()) return;
    try {
      setIsLoading(true);
      await catalogService.createCategory({ name: quickCategoryName, isActive: true });
      await loadData();
      setShowAddCategoryModal(false);
      setQuickCategoryName('');
      alert("Category created successfully!");
    } catch (err) {
      alert(err.message || 'Could not create category.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter parents and children
  const parentCategories = categories.filter(c => !c.parentCategory);
  const currentSubCategories = categories.filter(c => c.parentCategory && (c.parentCategory._id === selectedCategory || c.parentCategory === selectedCategory));

  return (
    <div className="flex h-screen bg-brand-light font-sans text-brand-dark overflow-hidden">
      
      {/* ── SIDEBAR ── */}
      <aside className="w-[260px] bg-white border-r border-[#E6DFD4] flex flex-col justify-between shrink-0 h-full overflow-y-auto">
        <div>
          {/* Logo */}
          <div className="pt-8 pb-6 px-8">
            <h1 className="font-bold text-xl tracking-widest text-brand-dark leading-tight">WOODENTOYS</h1>
            <p className="text-[10px] font-bold text-brand-medium uppercase tracking-widest mt-0.5">Admin Portal</p>
          </div>

          {/* Nav Links */}
          <nav className="px-4 space-y-1 mt-4">
            {canAccessDashboard && (
            <button 
              onClick={() => setCurrentTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-colors ${currentTab === 'dashboard' ? 'bg-[#E6DFD4] text-brand-dark' : 'text-brand-medium hover:bg-brand-light hover:text-brand-dark'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
              Dashboard
            </button>
            )}

            <div className="pt-2">
              <div className="pt-4 border-t border-[#E6DFD4]/50">

              {/* Staff Management - only shown if user has staff_management view permission */}
              {canView('staff_management') && (
                <>
                  <button
                    onClick={() => setStaffMenuOpen(o => !o)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors mb-0.5 ${
                      currentTab === 'staff' ? 'bg-[#F8F4EC] text-[#8B5E3C]' : 'text-gray-600 hover:bg-[#F8F4EC] hover:text-[#8B5E3C]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      Staff Management
                    </span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${staffMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {staffMenuOpen && (
                    <div className="ml-3 pl-3 border-l border-[#E6DFD4] space-y-0.5 mb-1">
                      <button
                        onClick={() => { setCurrentTab('staff'); setStaffSubTab('list'); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                          currentTab === 'staff' && staffSubTab === 'list' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        Staff List
                      </button>
                      
                      {hasPermission('staff_management', 'create') && (
                        <button
                          onClick={() => { setCurrentTab('staff'); setStaffSubTab('add'); setEditingStaff(null); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                            currentTab === 'staff' && staffSubTab === 'add' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                          Add Staff
                        </button>
                      )}
                      
                      {hasPermission('staff_management', 'edit') && (
                        <button
                          onClick={() => { setCurrentTab('staff'); setStaffSubTab('role-assign'); setRoleAssignStaff(null); }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                            currentTab === 'staff' && staffSubTab === 'role-assign' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          Role Assign
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Catalog Dropdown - only shown if user has catalog view permission */}
              {(isAdmin || canView('catalog')) && (
              <button
                onClick={() => setCatalogMenuOpen(o => !o)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors mt-1 mb-0.5 ${
                  currentTab.startsWith('v2-') ? 'bg-[#F8F4EC] text-[#8B5E3C]' : 'text-gray-600 hover:bg-[#F8F4EC] hover:text-[#8B5E3C]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  Catalog Management
                </span>
                <svg className={`w-3.5 h-3.5 transition-transform ${catalogMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              )}
              {catalogMenuOpen && (
                <div className="ml-3 pl-3 border-l border-[#E6DFD4] space-y-0.5 mb-1">
                  {canAccessCatalog && (
                  <button
                    onClick={() => setCurrentTab('v2-categories')}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                      currentTab === 'v2-categories' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                    Categories
                  </button>
                  )}
                  {canAccessCatalog && (
                  <button
                    onClick={() => setCurrentTab('v2-subcategories')}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                      currentTab === 'v2-subcategories' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    Sub Categories
                  </button>
                  )}
                  {canAccessCatalog && (
                  <button
                    onClick={() => setCurrentTab('v2-attributes')}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                      currentTab === 'v2-attributes' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Attributes
                  </button>
                  )}
                </div>
              )}
              </div>{/* close pt-4 */}

              {/* Products */}
              {canAccessCatalog && (
                <div className="pt-2 border-t border-[#E6DFD4]/50 mt-2">
                  <button
                    onClick={() => {
                      setProductMenuOpen(open => !open);
                      setCurrentTab('v2-products');
                      if (!productMenuOpen) setProductSubTab('list');
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors mb-0.5 ${
                      currentTab === 'v2-products' ? 'bg-[#F8F4EC] text-[#8B5E3C]' : 'text-gray-600 hover:bg-[#F8F4EC] hover:text-[#8B5E3C]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      Products Management
                    </span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${productMenuOpen || currentTab === 'v2-products' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {(productMenuOpen || currentTab === 'v2-products') && (
                    <div className="ml-3 pl-3 border-l border-[#E6DFD4] space-y-0.5 mb-1">
                      <button
                        onClick={() => { setCurrentTab('v2-products'); setProductSubTab('list'); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                          currentTab === 'v2-products' && productSubTab === 'list' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        Product List
                      </button>
                      <button
                        onClick={() => { setCurrentTab('v2-products'); setProductSubTab('add'); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                          currentTab === 'v2-products' && productSubTab === 'add' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add Product
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Orders Management */}
              {(isAdmin || canView('orders')) && (
                <div className="pt-2 border-t border-[#E6DFD4]/50 mt-2">
                  <button
                    onClick={() => setCurrentTab('orders')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors mb-0.5 ${
                      currentTab === 'orders' ? 'bg-[#F8F4EC] text-[#8B5E3C]' : 'text-gray-600 hover:bg-[#F8F4EC] hover:text-[#8B5E3C]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                      Orders Management
                    </span>
                  </button>
                </div>
              )}

              {/* Inventory Management */}
              {(isAdmin || canView('inventory')) && (
                <div className="pt-2 border-t border-[#E6DFD4]/50 mt-2">
                  <button
                    onClick={() => setInventoryMenuOpen(o => !o)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors mb-0.5 ${
                      currentTab === 'inventory' ? 'bg-[#F8F4EC] text-[#8B5E3C]' : 'text-gray-600 hover:bg-[#F8F4EC] hover:text-[#8B5E3C]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      Inventory Management
                    </span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${inventoryMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {inventoryMenuOpen && (
                    <div className="ml-3 pl-3 border-l border-[#E6DFD4] space-y-0.5 mb-1">
                      <button
                        onClick={() => { setCurrentTab('inventory'); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                          currentTab === 'inventory' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        Inventory List
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Fee Management */}
              {(isAdmin || canView('fees')) && (
                <div className="pt-2 border-t border-[#E6DFD4]/50 mt-2">
                  <button
                    onClick={() => setFeeMenuOpen(o => !o)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors mb-0.5 ${
                      currentTab === 'fees' ? 'bg-[#F8F4EC] text-[#8B5E3C]' : 'text-gray-600 hover:bg-[#F8F4EC] hover:text-[#8B5E3C]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Fee Management
                    </span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${feeMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {feeMenuOpen && (
                    <div className="ml-3 pl-3 border-l border-[#E6DFD4] space-y-0.5 mb-1">
                      <button
                        onClick={() => { setCurrentTab('fees'); setFeeSubTab('list'); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                          currentTab === 'fees' && feeSubTab === 'list' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        Fee List
                      </button>
                      <button
                        onClick={() => { setCurrentTab('fees'); setFeeSubTab('add'); setEditingFee(null); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                          currentTab === 'fees' && feeSubTab === 'add' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Add New Fee
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Cancellation Management */}
              {(isAdmin || canView('cancellation')) && (
                <div className="pt-2 border-t border-[#E6DFD4]/50 mt-2">
                  <button
                    onClick={() => setCurrentTab('cancellation')}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors mb-0.5 ${
                      currentTab === 'cancellation' ? 'bg-[#F8F4EC] text-[#8B5E3C]' : 'text-gray-600 hover:bg-[#F8F4EC] hover:text-[#8B5E3C]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Cancellation Management
                    </span>
                  </button>
                </div>
              )}

              {/* Refund Management */}
              {(isAdmin || canView('refund')) && (
                <div className="pt-2 border-t border-[#E6DFD4]/50 mt-2">
                  <button
                    onClick={() => setRefundMenuOpen(o => !o)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-colors mb-0.5 ${
                      currentTab === 'refund' ? 'bg-[#F8F4EC] text-[#8B5E3C]' : 'text-gray-600 hover:bg-[#F8F4EC] hover:text-[#8B5E3C]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      Refund Management
                    </span>
                    <svg className={`w-3.5 h-3.5 transition-transform ${refundMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {refundMenuOpen && (
                    <div className="ml-3 pl-3 border-l border-[#E6DFD4] space-y-0.5 mb-1">
                      <button
                        onClick={() => { setCurrentTab('refund'); setRefundSubTab('list'); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors ${
                          currentTab === 'refund' && refundSubTab === 'list' ? 'bg-[#8B5E3C]/10 text-[#8B5E3C] font-semibold' : 'text-gray-500 hover:text-[#8B5E3C] hover:bg-[#F8F4EC]'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        Refund List
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>{/* close pt-2 */}
          </nav>
        </div>

        <div className="p-4 border-t border-[#E6DFD4]">
          <div className="bg-brand-light p-3 rounded-2xl flex items-center gap-3 mb-4 border border-[#E6DFD4]">
            <div className="w-8 h-8 rounded-full bg-brand-dark text-white font-bold flex items-center justify-center text-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <p className="text-xs font-bold text-brand-dark leading-tight">{user?.name || 'admin'}</p>
              <p className="text-[10px] text-brand-medium capitalize">{user?.role || 'Admin'}</p>
            </div>
          </div>
          
          <button 
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-brand-medium hover:text-brand-dark transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            View Storefront
          </button>
          
          <button 
            onClick={() => {
              if (onLogout) {
                onLogout();
              } else {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.setItem('currentView', 'home');
                window.location.reload();
              }
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-red-600 hover:text-red-800 transition-colors mt-1"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {canAccessDashboard && currentTab === 'dashboard' && (
            <>
              {/* Header Row */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-brand-dark font-sans tracking-tight">Dashboard Overview</h2>
                  <p className="text-sm text-brand-medium mt-1">Welcome back. Here's what is happening today.</p>
                </div>
                <div className="flex items-center gap-3">
                  <select className="bg-white border border-[#E6DFD4] text-brand-dark text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-brand-medium cursor-pointer shadow-sm">
                    <option>Last 30 Days</option>
                    <option>Last 7 Days</option>
                    <option>All Time</option>
                  </select>
                  <button className="bg-brand-dark hover:bg-black text-white text-sm font-medium px-5 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                <div className="bg-white rounded-2xl p-5 border border-[#E6DFD4] shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xs font-semibold text-brand-medium uppercase tracking-widest">Total Revenue</h3>
                    <span className="text-brand-medium text-sm">$</span>
                  </div>
                  <p className="text-2xl font-bold text-brand-dark mb-4">${totalRevenue.toFixed(2)}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-green">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                    Real-time DB sync
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#E6DFD4] shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xs font-semibold text-brand-medium uppercase tracking-widest">Total Orders</h3>
                    <svg className="w-4 h-4 text-brand-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                  </div>
                  <p className="text-2xl font-bold text-brand-dark mb-4">{totalOrders}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-green">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                    Real-time DB sync
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#E6DFD4] shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xs font-semibold text-brand-medium uppercase tracking-widest">Total Customers</h3>
                    <svg className="w-4 h-4 text-brand-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                  </div>
                  <p className="text-2xl font-bold text-brand-dark mb-4">{totalCustomers}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-green">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                    Real-time DB sync
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-[#E6DFD4] shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xs font-semibold text-brand-medium uppercase tracking-widest">Total Products</h3>
                    <svg className="w-4 h-4 text-brand-medium" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                  </div>
                  <p className="text-2xl font-bold text-brand-dark mb-4">{totalProducts}</p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-green">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                    Real-time DB sync
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-[#E6DFD4] shadow-sm min-h-[300px] flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-sm font-bold text-brand-dark">Revenue Analytics</h3>
                      <p className="text-xs text-brand-medium mt-1">Daily revenue over the last 30 days</p>
                    </div>
                  </div>
                  <div className="flex-1 w-full h-full min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueAnalytics} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8B5E3C" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#8B5E3C" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{fontSize: 10, fill: '#8A817C'}} tickLine={false} axisLine={false} minTickGap={20} />
                        <YAxis tick={{fontSize: 10, fill: '#8A817C'}} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => [`$${value.toFixed(2)}`, 'Revenue']}
                          labelStyle={{ color: '#8A817C', fontSize: '12px', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#8B5E3C" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-[#E6DFD4] shadow-sm min-h-[300px] flex flex-col">
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-brand-dark">Order Volume</h3>
                    <p className="text-xs text-brand-medium mt-1">Orders by day of week</p>
                  </div>
                  <div className="flex-1 w-full h-full min-h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={orderVolume} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{fontSize: 10, fill: '#8A817C'}} tickLine={false} axisLine={false} />
                        <YAxis tick={{fontSize: 10, fill: '#8A817C'}} tickLine={false} axisLine={false} />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          cursor={{ fill: '#f3f4f6' }}
                        />
                        <Bar dataKey="value" fill="#141225" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB: CATALOG MANAGEMENT (CATEGORIES) */}
          {currentTab === 'catalog' && catalogSubTab === 'categories' && (
            <div className="space-y-6">
              {/* Category Dashboard Tabs Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E6DFD4] pb-4 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-brand-dark font-serif">Category Management</h2>
                  <p className="text-sm text-brand-medium">Manage top-level categories and their classification metadata.</p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCategorySubTab('list')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${categorySubTab === 'list' ? 'bg-brand-dark text-white shadow-md' : 'bg-white border border-[#E6DFD4] text-brand-medium hover:text-brand-dark'}`}
                  >
                    View Categories
                  </button>
                  <button 
                    onClick={() => {
                      setEditCategoryId(null);
                      setCatName('');
                      setCatDescription('');
                      setCatImage('');
                      setCatDisplayOrder('1');
                      setCatIsActive(true);
                      setCatSeoTitle('');
                      setCatSeoDescription('');
                      setCategorySubTab('add');
                    }}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${categorySubTab === 'add' || categorySubTab === 'edit' ? 'bg-brand-dark text-white shadow-md' : 'bg-white border border-[#E6DFD4] text-brand-medium hover:text-brand-dark'}`}
                  >
                    Create Category
                  </button>
                </div>
              </div>

              {/* CATEGORY LIST SUB TAB */}
              {categorySubTab === 'list' && (
                <div className="bg-white border border-[#E6DFD4] rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-brand-light/50 border-b border-[#E6DFD4] text-brand-medium text-[10px] font-bold tracking-widest uppercase">
                          <th className="py-4 px-6">Image</th>
                          <th className="py-4 px-6">Category</th>
                          <th className="py-4 px-6">Products</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6">Created</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6DFD4]/55 text-sm text-brand-dark">
                        {categories.filter(c => !c.parentCategory).map((cat) => (
                          <tr key={cat._id} className="hover:bg-brand-light/25 transition-colors">
                            <td className="py-4 px-6">
                              <div className="w-10 h-10 rounded-lg bg-brand-light/60 border border-[#E6DFD4] overflow-hidden shrink-0 flex items-center justify-center text-xl">
                                {cat.image ? (
                                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                                ) : (
                                  "📦"
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <h4 className="font-serif font-bold leading-tight">{cat.name}</h4>
                              <p className="text-[10px] text-brand-medium font-mono mt-0.5">{cat.slug}</p>
                            </td>
                            <td className="py-4 px-6 font-semibold">
                              {products.filter(p => p.category?._id === cat._id || p.category === cat._id).length}
                            </td>
                            <td className="py-4 px-6">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${cat.isActive !== false ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {cat.isActive !== false ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-xs text-brand-medium">
                              {cat.createdAt ? new Date(cat.createdAt).toLocaleDateString() : 'Today'}
                            </td>
                            <td className="py-4 px-6 text-right space-x-3">
                              <button 
                                onClick={() => handleEditCategoryClick(cat)}
                                className="text-brand-dark hover:text-black font-bold text-xs"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteCategory(cat._id)}
                                className="text-red-600 hover:text-red-800 font-bold text-xs"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ADD/EDIT CATEGORY SUB TAB */}
              {(categorySubTab === 'add' || categorySubTab === 'edit') && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={() => setShowAddCategoryModal(true)}
                      className="bg-brand-dark text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:bg-black transition-colors"
                    >
                      + Quick Add Category
                    </button>
                  </div>
                  <div className="bg-white border border-[#E6DFD4] rounded-2xl p-8 shadow-sm">
                    {successMsg && <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 text-xs font-bold rounded-r">{successMsg}</div>}
                    {errorMsg && <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 text-xs font-bold rounded-r">{errorMsg}</div>}

                    <form onSubmit={handleSaveCategory} className="space-y-6 max-w-3xl">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Category Name *</label>
                          <select 
                            required 
                            value={catName} 
                            onChange={(e) => setCatName(e.target.value)} 
                            className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium bg-white"
                          >
                            <option value="">Select Category</option>
                            {categories.filter(c => !c.parentCategory).map(c => (
                              <option key={c._id} value={c.name}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Sub Category Name</label>
                          <input 
                            type="text" 
                            value={catSubCategoryName} 
                            onChange={(e) => setCatSubCategoryName(e.target.value)} 
                            className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                            placeholder="e.g. Educational"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Attribute</label>
                        <input 
                          type="text" 
                          value={catAttribute} 
                          onChange={(e) => setCatAttribute(e.target.value)} 
                          className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                          placeholder="e.g. Material, Color"
                        />
                      </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Category Slug</label>
                      <input 
                        type="text" 
                        disabled 
                        value={catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')} 
                        className="w-full bg-brand-light border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm font-mono text-brand-medium outline-none"
                        placeholder="Auto Generated"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Category Image (URL)</label>
                      <input 
                        type="text" 
                        value={catImage} 
                        onChange={(e) => setCatImage(e.target.value)} 
                        className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Description</label>
                      <textarea 
                        rows="3" 
                        value={catDescription} 
                        onChange={(e) => setCatDescription(e.target.value)} 
                        className="w-full border border-[#E6DFD4] rounded-xl p-4 text-sm focus:outline-none focus:border-brand-medium"
                        placeholder="Category description..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Display Order</label>
                        <input 
                          type="number" 
                          value={catDisplayOrder} 
                          onChange={(e) => setCatDisplayOrder(e.target.value)} 
                          className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Status</label>
                        <div className="flex items-center gap-6 pt-2">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input 
                              type="radio" 
                              checked={catIsActive === true} 
                              onChange={() => setCatIsActive(true)}
                              className="w-4 h-4 text-brand-dark focus:ring-brand-medium"
                            />
                            <span className="font-medium text-brand-dark">Active</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input 
                              type="radio" 
                              checked={catIsActive === false} 
                              onChange={() => setCatIsActive(false)}
                              className="w-4 h-4 text-brand-dark focus:ring-brand-medium"
                            />
                            <span className="font-medium text-brand-medium">Inactive</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#E6DFD4] pt-6 space-y-4">
                      <h3 className="font-serif font-bold text-sm text-brand-dark">SEO Information</h3>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">SEO Title</label>
                        <input 
                          type="text" 
                          value={catSeoTitle} 
                          onChange={(e) => setCatSeoTitle(e.target.value)} 
                          className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                          placeholder="e.g. Buy Wooden Puzzles Online"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">SEO Description</label>
                        <textarea 
                          rows="2" 
                          value={catSeoDescription} 
                          onChange={(e) => setCatSeoDescription(e.target.value)} 
                          className="w-full border border-[#E6DFD4] rounded-xl p-4 text-sm focus:outline-none focus:border-brand-medium"
                          placeholder="Meta description for search engines"
                        />
                      </div>
                    </div>

                    <div className="border-t border-[#E6DFD4] pt-6 flex justify-end gap-3">
                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className="bg-brand-dark hover:bg-black text-white text-xs font-bold uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-md transition-colors disabled:opacity-60"
                      >
                        {isLoading ? 'Saving...' : 'Save Category'}
                      </button>
                    </div>
                  </form>
                </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: SUB CATEGORIES */}
          {currentTab === 'subcategories' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E6DFD4] pb-4 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-brand-dark font-serif">Sub Categories</h2>
                  <p className="text-sm text-brand-medium">Manage subcategories under primary categories.</p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSubCategorySubTab('list')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${subCategorySubTab === 'list' ? 'bg-brand-dark text-white shadow-md' : 'bg-white border border-[#E6DFD4] text-brand-medium hover:text-brand-dark'}`}
                  >
                    View Sub Categories
                  </button>
                  <button 
                    onClick={() => setSubCategorySubTab('add')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${subCategorySubTab === 'add' ? 'bg-brand-dark text-white shadow-md' : 'bg-white border border-[#E6DFD4] text-brand-medium hover:text-brand-dark'}`}
                  >
                    + Add Sub Category
                  </button>
                </div>
              </div>

              {subCategorySubTab === 'list' && (
                <div className="bg-white border border-[#E6DFD4] rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-brand-light/50 border-b border-[#E6DFD4] text-brand-medium text-[10px] font-bold tracking-widest uppercase">
                          <th className="py-4 px-6">Name</th>
                          <th className="py-4 px-6">Parent Category</th>
                          <th className="py-4 px-6">SKU Code</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6DFD4]/55 text-sm text-brand-dark">
                        {categories.filter(c => c.parentCategory).length === 0 ? (
                          <tr>
                            <td colSpan="4" className="py-8 text-center text-brand-medium text-sm">No subcategories found.</td>
                          </tr>
                        ) : (
                          categories.filter(c => c.parentCategory).map((subCat) => (
                            <tr key={subCat._id} className="hover:bg-brand-light/25 transition-colors">
                              <td className="py-4 px-6">
                                <h4 className="font-serif font-bold leading-tight">{subCat.name}</h4>
                              </td>
                              <td className="py-4 px-6">
                                {subCat.parentCategory?.name || '-'}
                              </td>
                              <td className="py-4 px-6 font-mono text-xs">
                                {subCat.slug || '-'}
                              </td>
                              <td className="py-4 px-6 text-right space-x-3">
                                <button className="text-brand-dark hover:text-black font-bold text-xs">Edit</button>
                                <button className="text-red-600 hover:text-red-800 font-bold text-xs">Delete</button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {subCategorySubTab === 'add' && (
                <div className="bg-white border border-[#E6DFD4] rounded-2xl p-8 shadow-sm">
                  <form className="space-y-6 max-w-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Name *</label>
                        <input 
                          type="text" 
                          required 
                          className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                          placeholder="Subcategory Name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Property</label>
                        <input 
                          type="text" 
                          className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                          placeholder="Property/Type"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Parent Category *</label>
                        <select 
                          required 
                          className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium bg-white"
                        >
                          <option value="">Select Category</option>
                          {categories.filter(c => !c.parentCategory).map(c => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Code (SKU) *</label>
                        <input 
                          type="text" 
                          required 
                          className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                          placeholder="SUB-CAT-001"
                        />
                      </div>
                    </div>
                    <div className="border-t border-[#E6DFD4] pt-6 flex justify-end gap-3">
                      <button 
                        type="submit" 
                        className="bg-brand-dark hover:bg-black text-white text-xs font-bold uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-md transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* Quick Create Category Modal */}
          {showAddCategoryModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                <button 
                  onClick={() => setShowAddCategoryModal(false)}
                  className="absolute top-4 right-4 text-brand-medium hover:text-brand-dark"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <h3 className="text-xl font-bold font-serif text-brand-dark mb-4">Quick Add Category</h3>
                <form onSubmit={handleQuickCreateCategory} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-brand-medium">Category Name</label>
                    <input 
                      type="text" 
                      autoFocus
                      required 
                      value={quickCategoryName} 
                      onChange={(e) => setQuickCategoryName(e.target.value)} 
                      className="w-full border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-medium"
                      placeholder="Enter brand or category name"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-brand-dark hover:bg-black text-white text-xs font-bold uppercase tracking-wider py-3.5 rounded-xl shadow-md transition-colors disabled:opacity-60"
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCT MANAGEMENT */}
          {currentTab === 'products' && (
            <div className="space-y-6">
              {/* Product Dashboard Tabs Row */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E6DFD4] pb-4 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-brand-dark font-serif">Product Management</h2>
                  <p className="text-sm text-brand-medium">Manage store items, pricing, inventory, and media assets.</p>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setProductSubTab('list')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${productSubTab === 'list' ? 'bg-brand-dark text-white shadow-md' : 'bg-white border border-[#E6DFD4] text-brand-medium hover:text-brand-dark'}`}
                  >
                    Product List
                  </button>
                  <button 
                    onClick={() => setProductSubTab('add')}
                    className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${productSubTab === 'add' ? 'bg-brand-dark text-white shadow-md' : 'bg-white border border-[#E6DFD4] text-brand-medium hover:text-brand-dark'}`}
                  >
                    + Add Product
                  </button>
                </div>
              </div>

              {/* SUB TAB 1: PRODUCT LIST */}
              {productSubTab === 'list' && (
                <div className="bg-white border border-[#E6DFD4] rounded-2xl overflow-hidden shadow-sm">
                  {products.length === 0 ? (
                    <div className="p-16 text-center">
                      <svg className="w-12 h-12 text-brand-medium mx-auto opacity-40 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                      <h4 className="font-serif text-lg font-bold text-brand-dark">No Products Found</h4>
                      <p className="text-xs text-brand-medium mt-1">Get started by creating your first wooden toy.</p>
                      <button 
                        onClick={() => setProductSubTab('add')}
                        className="bg-brand-dark text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl mt-4 hover:bg-black transition-colors"
                      >
                        Create Product
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-brand-light/50 border-b border-[#E6DFD4] text-brand-medium text-[10px] font-bold tracking-widest uppercase">
                            <th className="py-4 px-6">Product</th>
                            <th className="py-4 px-6">Category</th>
                            <th className="py-4 px-6">SKU</th>
                            <th className="py-4 px-6">Price</th>
                            <th className="py-4 px-6">Stock</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E6DFD4]/55 text-sm text-brand-dark">
                          {products.map((prod) => (
                            <tr key={prod._id} className="hover:bg-brand-light/25 transition-colors">
                              <td className="py-4 px-6 flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-lg bg-brand-light/60 border border-[#E6DFD4] overflow-hidden shrink-0 flex items-center justify-center">
                                  {prod.images && prod.images.length > 0 ? (
                                    <img src={prod.images[0]} alt={prod.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[10px] font-bold text-brand-medium uppercase">No Pic</span>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-serif font-bold leading-tight">{prod.name}</h4>
                                  <p className="text-[10px] text-brand-medium font-mono mt-0.5">{prod._id}</p>
                                </div>
                              </td>
                              <td className="py-4 px-6 capitalize">
                                {prod.category?.name || 'Unassigned'}
                                {prod.subCategory && ` / ${prod.subCategory.name}`}
                              </td>
                              <td className="py-4 px-6 font-mono text-xs">
                                {prod.inventory?.sku || 'N/A'}
                              </td>
                              <td className="py-4 px-6 font-semibold">
                                ${prod.price.toFixed(2)}
                              </td>
                              <td className="py-4 px-6">
                                {prod.inventory ? (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${prod.inventory.stockQuantity > 5 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                    {prod.inventory.stockQuantity} items
                                  </span>
                                ) : (
                                  <span className="text-red-500 text-xs italic">No Inventory</span>
                                )}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button 
                                  onClick={() => handleDeleteProduct(prod._id)}
                                  className="text-red-600 hover:text-red-800 font-bold text-xs"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUB TAB 2: ADD PRODUCT */}
              {productSubTab === 'add' && (
                <div className="bg-white border border-[#E6DFD4] rounded-2xl p-8 shadow-sm">
                  
                  {/* Banner Messages */}
                  {successMsg && <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 p-4 text-xs font-bold rounded-r">{successMsg}</div>}
                  {errorMsg && <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 text-xs font-bold rounded-r">{errorMsg}</div>}

                  <form onSubmit={handleAddProductSubmit} className="space-y-6">
                    
                    {/* Basic Info Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Product Name *</label>
                        <input 
                          type="text" 
                          required 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                          placeholder="e.g. Handmade Oak Blocks"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">SKU Code *</label>
                        <input 
                          type="text" 
                          required 
                          value={sku} 
                          onChange={(e) => setSku(e.target.value)} 
                          className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-brand-medium"
                          placeholder="e.g. TOY-OAK-BLOCKS"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Price ($) *</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            required 
                            value={price} 
                            onChange={(e) => setPrice(e.target.value)} 
                            className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                            placeholder="e.g. 29.99"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Initial Stock *</label>
                          <input 
                            type="number" 
                            min="0" 
                            required 
                            value={stock} 
                            onChange={(e) => setStock(e.target.value)} 
                            className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                            placeholder="e.g. 10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Product Description *</label>
                        <textarea 
                          rows="2" 
                          required 
                          value={description} 
                          onChange={(e) => setDescription(e.target.value)} 
                          className="w-full border border-[#E6DFD4] rounded-xl p-4 text-sm focus:outline-none focus:border-brand-medium"
                          placeholder="Provide detailed description of materials, safety information, etc."
                        />
                      </div>
                    </div>

                    {/* PRODUCT CLASSIFICATION ACCORDION / BOX */}
                    <div className="bg-[#FAF9F5] border border-[#E6DFD4] rounded-2xl p-6 space-y-6">
                      <div className="border-b border-[#E6DFD4] pb-3 flex justify-between items-center">
                        <div>
                          <h3 className="text-xs font-bold tracking-widest uppercase text-[#807058]">Product Classification</h3>
                          <p className="text-[10px] text-brand-medium mt-0.5">Specify tags, wood source, skill development, and age criteria.</p>
                        </div>
                        <span className="text-xs bg-brand-dark/10 text-brand-dark px-2.5 py-0.5 rounded-full font-bold">Category Flow</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Parent Category Selector */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium">Category *</label>
                          </div>
                          <select 
                            required 
                            value={selectedCategory} 
                            onChange={(e) => setSelectedCategory(e.target.value)} 
                            className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-brand-medium"
                          >
                            <option value="" disabled>Select Category</option>
                            {parentCategories.map(c => (
                              <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Sub Category Selector */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium">Sub Category</label>
                          </div>
                          <select 
                            value={selectedSubCategory} 
                            onChange={(e) => setSelectedSubCategory(e.target.value)} 
                            className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-brand-medium disabled:opacity-60"
                            disabled={!selectedCategory || currentSubCategories.length === 0}
                          >
                            <option value="">None (Top Level Only)</option>
                            {currentSubCategories.map(c => (
                              <option key={c._id} value={c._id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Age Group Checkboxes */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Age Group *</label>
                          <div className="flex flex-wrap gap-4 pt-1">
                            {ageGroupOptions.map(option => (
                              <label key={option} className="flex items-center space-x-2 text-xs text-brand-dark font-medium cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={selectedAgeGroups.includes(option)}
                                  onChange={() => toggleSelection(option, selectedAgeGroups, setSelectedAgeGroups)}
                                  className="w-4 h-4 rounded text-brand-dark focus:ring-brand-medium"
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Toy Type Checkboxes */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Toy Type *</label>
                          <div className="flex flex-wrap gap-4 pt-1">
                            {toyTypeOptions.map(option => (
                              <label key={option} className="flex items-center space-x-2 text-xs text-brand-dark font-medium cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={selectedToyTypes.includes(option)}
                                  onChange={() => toggleSelection(option, selectedToyTypes, setSelectedToyTypes)}
                                  className="w-4 h-4 rounded text-brand-dark focus:ring-brand-medium"
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Wood Type Dropdown */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Wood Type *</label>
                          <select 
                            value={selectedWoodType}
                            onChange={(e) => setSelectedWoodType(e.target.value)}
                            className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-brand-medium"
                          >
                            {woodTypeOptions.map(option => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </div>

                        {/* Theme Checkboxes */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Theme *</label>
                          <div className="flex flex-wrap gap-4 pt-1">
                            {themeOptions.map(option => (
                              <label key={option} className="flex items-center space-x-2 text-xs text-brand-dark font-medium cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={selectedThemes.includes(option)}
                                  onChange={() => toggleSelection(option, selectedThemes, setSelectedThemes)}
                                  className="w-4 h-4 rounded text-brand-dark focus:ring-brand-medium"
                                />
                                <span>{option}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                      </div>

                      {/* Skill Development Checkboxes */}
                      <div className="space-y-2 pt-2 border-t border-[#E6DFD4]/60">
                        <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Skill Development *</label>
                        <div className="flex flex-wrap gap-4 pt-1">
                          {skillDevelopmentOptions.map(option => (
                            <label key={option} className="flex items-center space-x-2 text-xs text-brand-dark font-medium cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={selectedSkills.includes(option)}
                                onChange={() => toggleSelection(option, selectedSkills, setSelectedSkills)}
                                className="w-4 h-4 rounded text-brand-dark focus:ring-brand-medium"
                              />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Product Photos Section */}
                    <div className="border-t border-[#E6DFD4] pt-6 space-y-4">
                      <div>
                        <h3 className="font-serif font-bold text-lg text-brand-dark">Product Photos</h3>
                        <p className="text-xs text-brand-medium mt-0.5">Upload local files or add image URLs. Drag-free arrow controls allow you to reorder photos easily.</p>
                      </div>

                      {/* Photo inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Add Photo via URL</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={tempPhotoUrl} 
                              onChange={(e) => setTempPhotoUrl(e.target.value)} 
                              className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2.5 text-sm focus:outline-none"
                              placeholder="https://images.unsplash.com/photo-..."
                            />
                            <button 
                              type="button" 
                              onClick={handleAddPhotoUrl}
                              className="bg-brand-dark hover:bg-black text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl whitespace-nowrap"
                            >
                              Add URL
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium block">Upload Files</label>
                          <label className="w-full border border-dashed border-[#E6DFD4] hover:bg-brand-light/30 rounded-xl px-4 py-2.5 text-xs text-center font-bold text-brand-dark cursor-pointer block border-brand-medium/40 transition-colors">
                            Choose Files
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*" 
                              onChange={handleFileUpload} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>

                      {/* Photo Grid / Reordering Area */}
                      {photos.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 pt-2">
                          {photos.map((url, idx) => (
                            <div key={url + idx} className="relative group bg-white border border-[#E6DFD4] rounded-2xl overflow-hidden shadow-sm flex flex-col">
                              <div className="h-28 bg-brand-light/50 relative overflow-hidden flex items-center justify-center border-b border-[#E6DFD4]">
                                <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute top-2 left-2 bg-brand-dark text-white text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">
                                  Pos: {idx + 1}
                                </div>
                              </div>

                              <div className="p-2 flex items-center justify-between gap-1 bg-[#FDFCF7]">
                                <div className="flex gap-1">
                                  <button 
                                    type="button" 
                                    disabled={idx === 0}
                                    onClick={() => movePhoto(idx, 'left')}
                                    className="bg-white border border-[#E6DFD4] text-[#807058] hover:bg-brand-light disabled:opacity-30 rounded p-1 text-[10px] font-bold transition-all cursor-pointer"
                                    title="Move Left"
                                  >
                                    ΓåÉ
                                  </button>
                                  <button 
                                    type="button" 
                                    disabled={idx === photos.length - 1}
                                    onClick={() => movePhoto(idx, 'right')}
                                    className="bg-white border border-[#E6DFD4] text-[#807058] hover:bg-brand-light disabled:opacity-30 rounded p-1 text-[10px] font-bold transition-all cursor-pointer"
                                    title="Move Right"
                                  >
                                    ΓåÆ
                                  </button>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => deletePhoto(idx)}
                                  className="text-red-500 hover:text-red-700 p-1 text-[10px] font-bold transition-all cursor-pointer"
                                  title="Delete Photo"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-brand-light/30 border border-dashed border-[#E6DFD4] rounded-2xl py-12 text-center text-xs text-brand-medium">
                          No photos added yet. Add a URL or upload images to preview and reorder.
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    <div className="border-t border-[#E6DFD4] pt-6 flex justify-end gap-3">
                      <button 
                        type="button" 
                        onClick={() => setProductSubTab('list')}
                        className="bg-white border border-[#E6DFD4] hover:bg-brand-light/50 text-brand-dark text-xs font-bold uppercase tracking-wider px-6 py-3.5 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className="bg-brand-dark hover:bg-black text-white text-xs font-bold uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-md transition-colors disabled:opacity-60"
                      >
                        {isLoading ? 'Saving Product...' : 'Save Product'}
                      </button>
                    </div>

                  </form>

                </div>
              )}

            </div>
          )}

          {canAccessCatalog && currentTab === 'v2-categories' && <CategoriesPage />}
          {canAccessCatalog && currentTab === 'v2-subcategories' && <SubCategoriesPage />}
          {canAccessCatalog && currentTab === 'v2-attributes' && <AttributesPage />}
          {canAccessCatalog && currentTab === 'v2-products' && <ProductsPage />}

          {/* ── STAFF MANAGEMENT ── */}
          {canAccessStaff && currentTab === 'staff' && staffSubTab === 'list' && (
            <StaffListPage
              canCreate={hasPermission('staff_management', 'create')}
              canEdit={hasPermission('staff_management', 'edit')}
              canDelete={hasPermission('staff_management', 'delete')}
              onAddStaff={() => { setEditingStaff(null); setStaffSubTab('add'); }}
              onEditStaff={(member) => { setEditingStaff(member); setStaffSubTab('add'); }}
              onRoleAssign={(member) => { setRoleAssignStaff(member); setStaffSubTab('role-assign'); }}
            />
          )}
          {canAccessStaff && currentTab === 'staff' && staffSubTab === 'add' && (
            <AddStaffPage
              editingStaff={editingStaff}
              onBack={() => setStaffSubTab('list')}
              onSuccess={(staff) => { setRoleAssignStaff(staff); setStaffSubTab('role-assign'); }}
            />
          )}
          {canAccessStaff && currentTab === 'staff' && staffSubTab === 'role-assign' && (
            <RoleAssignPage
              targetStaff={roleAssignStaff}
              onBack={() => setStaffSubTab('list')}
            />
          )}

          {/* ── INVENTORY MANAGEMENT ── */}
          {(isAdmin || canView('inventory')) && currentTab === 'inventory' && (
            <InventoryManagement />
          )}

          {/* ── ORDERS MANAGEMENT ── */}
          {(isAdmin || canView('orders')) && currentTab === 'orders' && (
            <OrdersPage />
          )}

          {/* ── FEE MANAGEMENT ── */}
          {(isAdmin || canView('fees')) && currentTab === 'fees' && feeSubTab === 'list' && (
            <FeeListPage 
              onNavigate={(tab, fee) => {
                setEditingFee(fee || null);
                setFeeSubTab(tab);
              }} 
              onEditFee={(fee) => { setEditingFee(fee); setFeeSubTab('add'); }} 
            />
          )}
          {(isAdmin || canView('fees')) && currentTab === 'fees' && feeSubTab === 'add' && (
            <AddFeePage 
              onNavigate={(tab) => setFeeSubTab(tab)} 
              editingFee={editingFee} 
            />
          )}

          {/* ── CANCELLATION MANAGEMENT ── */}
          {(isAdmin || canView('cancellation')) && currentTab === 'cancellation' && (
            <CancellationManagementPage />
          )}

          {/* ── REFUND MANAGEMENT ── */}
          {(isAdmin || canView('refund')) && currentTab === 'refund' && (
            <RefundManagementPage />
          )}

        </div>
      </main>



    </div>
  );
}
