import React, { useState, useEffect } from 'react';
import { Package, Boxes, AlertTriangle, XCircle, Search, Filter, Download, Plus, Eye, Edit2, Clock, X, RefreshCw } from 'lucide-react';
import './InventoryManagement.css';
import { catalogService } from '../../../api/catalogService';
import { variantAPI } from '../../../api/catalogAdminService';
import toast from 'react-hot-toast';
import { downloadExcelFile } from '../../../utils/exportUtils';

const API_ORIGIN = 'http://localhost:5000';

function ProductThumbnail({ src, alt, className = 'product-thumb' }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return <div className={`${className} image-placeholder`}>No Img</div>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

export default function InventoryManagement({ canEdit = true, canDelete = true }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [stockHistoryModalOpen, setStockHistoryModalOpen] = useState(false);
  const [selectedProductHistory, setSelectedProductHistory] = useState(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null); // { type: 'product' | 'variant', data: ... }
  const [editStock, setEditStock] = useState(0);
  const [editCurrentStock, setEditCurrentStock] = useState(0);
  const [editReserveStock, setEditReserveStock] = useState(0);

  const [addStockModalOpen, setAddStockModalOpen] = useState(false);
  const [addStockItem, setAddStockItem] = useState(null);
  const [addStockAmount, setAddStockAmount] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState('');

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'detail'
  const [viewProduct, setViewProduct] = useState(null);

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    setLoading(true);
    try {
      const data = await catalogService.getProducts();
      const productList = data || [];
      setProducts(productList);

      // Attempt to fetch variants for products
      const allVariants = [];
      await Promise.allSettled(
        productList.map(async (prod) => {
           try {
             const res = await variantAPI.getVariants(prod._id);
             if (res && res.data && res.data.data) {
                const vars = res.data.data.map(v => ({ ...v, productName: prod.name }));
                allVariants.push(...vars);
             }
           } catch(e) { /* ignore products without new variant system */ }
        })
      );
      setVariants(allVariants);
    } catch (error) {
      toast.error('Failed to load inventory data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async () => {
    try {
      if (editItem.type === 'product') {
        const productVariants = getProductVariants(editItem.data);
        if (productVariants.length > 0 && selectedVariantId) {
          await variantAPI.updateVariant(selectedVariantId, { 
            inventory: Number(editStock),
            currentStock: Math.max(0, Number(editStock) - Number(editReserveStock)),
            reserveStock: Number(editReserveStock)
          });
          toast.success('Variant stock updated successfully');
        } else {
          const productId = editItem.data._id;
          const currentInv = editItem.data.inventory;
          const sku = currentInv?.sku || `SKU-${productId.substring(0,6)}`;
          const payload = { stockQuantity: Number(editStock), sku };
  
          if (currentInv) {
            await catalogService.updateInventory(productId, payload);
          } else {
            await catalogService.createInventory({ product: productId, stockQuantity: payload.stockQuantity, sku, warehouseLocation: 'Main', lowStockThreshold: 5 });
          }
          toast.success('Stock updated successfully');
        }
      } else if (editItem.type === 'variant') {
        const variantId = editItem.data._id;
        await variantAPI.updateVariant(variantId, { 
          inventory: Number(editStock),
          currentStock: Math.max(0, Number(editStock) - Number(editReserveStock)),
          reserveStock: Number(editReserveStock)
        });
        toast.success('Variant stock updated successfully');
      }
      setEditModalOpen(false);
      setSelectedVariantId('');
      fetchInventoryData();
    } catch (error) {
      toast.error('Failed to update stock');
      console.error(error);
    }
  };

  const handleAddStock = async () => {
    try {
      if (addStockItem.type === 'product') {
        const productVariants = getProductVariants(addStockItem.data);
        if (productVariants.length > 0 && selectedVariantId) {
          const selectedVar = productVariants.find(v => v._id === selectedVariantId);
          const currentStock = selectedVar?.inventory || 0;
          const newStock = Number(currentStock) + Number(addStockAmount);
          await variantAPI.updateVariant(selectedVariantId, { inventory: newStock });
          toast.success('Variant stock added successfully');
        } else {
          const productId = addStockItem.data._id;
          const currentInv = addStockItem.data.inventory;
          const newStock = Number(currentInv?.stockQuantity || 0) + Number(addStockAmount);
          const sku = currentInv?.sku || `SKU-${productId.substring(0,6)}`;
          const payload = { stockQuantity: newStock, sku };
          
          if (currentInv) {
            await catalogService.updateInventory(productId, payload);
          } else {
            await catalogService.createInventory({ product: productId, stockQuantity: payload.stockQuantity, sku, warehouseLocation: 'Main', lowStockThreshold: 5 });
          }
          toast.success('Stock added successfully');
        }
      } else if (addStockItem.type === 'variant') {
        const variantId = addStockItem.data._id;
        const currentStock = addStockItem.data.inventory || 0;
        const newStock = Number(currentStock) + Number(addStockAmount);
        await variantAPI.updateVariant(variantId, { inventory: newStock });
        toast.success('Variant stock added successfully');
      }
      setAddStockModalOpen(false);
      setAddStockAmount(0);
      setSelectedVariantId('');
      fetchInventoryData();
    } catch (error) {
      toast.error('Failed to add stock');
      console.error(error);
    }
  };

  const getStatus = (current, lowLimit = 5) => {
    if (current === 0 || !current) return { label: 'Out of Stock', class: 'status-out-of-stock' };
    if (current <= lowLimit) return { label: 'Low Stock', class: 'status-low-stock' };
    return { label: 'In Stock', class: 'status-in-stock' };
  };

  const normalizeMediaUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;
    if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
      return trimmed;
    }
    const normalizedPath = trimmed.replace(/\\/g, '/');
    if (normalizedPath.startsWith('/uploads') || normalizedPath.startsWith('uploads/')) {
      return `${API_ORIGIN}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
    }
    if (normalizedPath.startsWith('/')) return normalizedPath;
    return `${API_ORIGIN}/uploads/${normalizedPath}`;
  };

  const getProductImage = (item) => {
    const images = Array.isArray(item?.images) ? item.images : [];
    const thumbnail = images.find((image) => image?.isThumbnail);
    const firstImage = thumbnail || images.find(Boolean);

    if (typeof firstImage === 'string') return normalizeMediaUrl(firstImage);
    if (firstImage?.url) return normalizeMediaUrl(firstImage.url);
    if (typeof item?.image === 'string') return normalizeMediaUrl(item.image);
    if (item?.image?.url) return normalizeMediaUrl(item.image.url);
    return null;
  };

  const getProductSku = (item) => {
    return item?.inventory?.sku || item?.sku || item?.productSku || 'N/A';
  };

  const getProductVariants = (product) => {
    return variants.filter(v => v.product === product?._id || v.productName === product?.name);
  };

  const getInventoryImage = (product, productVariants = []) => {
    return getProductImage(product) || productVariants.map(getProductImage).find(Boolean) || null;
  };

  const getInventorySku = (product, productVariants = []) => {
    const productSku = getProductSku(product);
    if (productSku !== 'N/A') return productSku;
    return productVariants.find((variant) => variant?.sku)?.sku || 'N/A';
  };

  const exportInventoryExcel = () => {
    const header = ['Product Name', 'SKU', 'Total Stock', 'Reserved Stock', 'Current Stock', 'Status', 'Product ID'];
    const rows = products.map((product) => {
      const productVariants = getProductVariants(product);
      const totalStock = productVariants.length > 0
        ? productVariants.reduce((acc, v) => acc + (v.inventory || 0), 0)
        : (product.inventory?.stockQuantity || 0);
      const reservedStock = productVariants.length > 0
        ? productVariants.reduce((acc, v) => acc + (v.reserveStock || 0), 0)
        : (product.inventory?.reserveStock || 0);
      const currentStock = productVariants.length > 0
        ? productVariants.reduce((acc, v) => acc + Math.max(0, (v.inventory || 0) - (v.reserveStock || 0)), 0)
        : (product.inventory?.stockQuantity || 0);
      return {
        'Product Name': product.name || 'Unnamed Product',
        SKU: getInventorySku(product, productVariants),
        'Total Stock': totalStock,
        'Reserved Stock': reservedStock,
        'Current Stock': currentStock,
        Status: getStatus(currentStock).label,
        'Product ID': product._id,
      };
    });
    downloadExcelFile('inventory', header, rows);
  };

  const openEditModal = (item, type) => {
    setEditItem({ type, data: item });
    if (type === 'product') {
      const productVariants = getProductVariants(item);
      if (productVariants.length > 0) {
        setSelectedVariantId(productVariants[0]._id);
        setEditStock(productVariants[0].inventory || 0);
        setEditCurrentStock(productVariants[0].currentStock || 0);
        setEditReserveStock(productVariants[0].reserveStock || 0);
      } else {
        setSelectedVariantId('');
        setEditStock(item.inventory?.stockQuantity || 0);
        setEditCurrentStock(0);
        setEditReserveStock(0);
      }
    }
    if (type === 'variant') {
      setSelectedVariantId('');
      setEditStock(item.inventory || 0);
      setEditCurrentStock(item.currentStock || 0);
      setEditReserveStock(item.reserveStock || 0);
    }
    setEditModalOpen(true);
  };

  const openAddStockModal = (item, type) => {
    setAddStockItem({ type, data: item });
    setAddStockAmount(0);
    if (type === 'product') {
      const productVariants = getProductVariants(item);
      if (productVariants.length > 0) {
        setSelectedVariantId(productVariants[0]._id);
      } else {
        setSelectedVariantId('');
      }
    } else {
      setSelectedVariantId('');
    }
    setAddStockModalOpen(true);
  };

  const openViewModal = (item) => {
    setViewProduct(item);
    setViewMode('detail');
  };

  const closeViewMode = () => {
    setViewMode('list');
    setViewProduct(null);
  };

  const filteredProducts = products.filter((p) => {
    const query = searchTerm.toLowerCase();
    const productVariants = getProductVariants(p);
    return p.name?.toLowerCase().includes(query) || getInventorySku(p, productVariants).toLowerCase().includes(query);
  });

  // Calculate summary stats dynamically
  let totalProducts = products.length;
  let totalStock = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  products.forEach(p => {
    const productVariants = variants.filter(v => v.product === p._id || v.productName === p.name);
    let pStock = 0;
    if (productVariants.length > 0) {
      pStock = productVariants.reduce((acc, v) => acc + Math.max(0, (v.inventory || 0) - (v.reserveStock || 0)), 0);
    } else {
      pStock = p.inventory?.stockQuantity || 0;
    }

    totalStock += pStock;
    if (p.isLowStock && pStock > 0) lowStockCount++;
    if (pStock === 0) outOfStockCount++;
  });

  if (loading) {
    return <div className="p-10 text-center text-gray-500 font-medium">Loading inventory...</div>;
  }

  return (
    <div className="inventory-management-wrapper">
      {/* HEADER & ACTION BAR */}
      <div className="inventory-header">
        <div>
          <h1 className="inventory-page-title">Inventory Management</h1>
          <p className="inventory-page-subtitle">Track and manage your product stock efficiently.</p>
        </div>
        <div className="action-bar flex items-center gap-3">
          <button className="admin-secondary-btn" onClick={fetchInventoryData}>
            <RefreshCw size={16} /> Refresh
          </button>
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search Product or SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="admin-export-btn" onClick={exportInventoryExcel}>
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div className="summary-cards-container">
        <div className="summary-card default-card group">
          <div className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors">
            <Package size={24} />
          </div>
          <div className="card-content">
            <p className="card-title">Total Products</p>
            <h3 className="card-value">{totalProducts}</h3>
          </div>
        </div>
        <div className="summary-card default-card group">
          <div className="card-icon-wrapper bg-purple-50 text-purple-600 group-hover:scale-110 transition-transform">
            <Boxes size={24} />
          </div>
          <div className="card-content">
            <p className="card-title">Total Stock</p>
            <h3 className="card-value">{totalStock}</h3>
          </div>
        </div>
        <div className="summary-card warning-card group">
          <div className="card-icon-wrapper bg-orange-100 text-orange-600 group-hover:scale-110 transition-transform">
            <AlertTriangle size={24} />
          </div>
          <div className="card-content">
            <p className="card-title text-orange-100">Low Stock</p>
            <h3 className="card-value text-white">{lowStockCount}</h3>
          </div>
        </div>
        <div className="summary-card danger-card group">
          <div className="card-icon-wrapper bg-red-100 text-red-600 group-hover:scale-110 transition-transform">
            <XCircle size={24} />
          </div>
          <div className="card-content">
            <p className="card-title text-red-100">Out of Stock</p>
            <h3 className="card-value text-white">{outOfStockCount}</h3>
          </div>
        </div>
      </div>

      {viewMode === 'detail' && viewProduct ? (
        <div className="inventory-detail-view bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mt-6">
          <div className="detail-header">
            <div className="detail-breadcrumb">
              <button onClick={closeViewMode} className="detail-backlink">
                <span className="detail-back-icon">&larr;</span> Back to Inventory
              </button>
              <span className="detail-breadcrumb-separator">|</span>
              <span className="detail-breadcrumb-title">{viewProduct?.name}</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-8 items-start">
            <ProductThumbnail
              src={getInventoryImage(viewProduct, getProductVariants(viewProduct))}
              alt={viewProduct?.name}
              className="w-full md:w-64 h-64 object-cover rounded-xl border border-gray-200 shadow-sm bg-gray-100 flex items-center justify-center text-sm text-gray-500"
            />
            <div className="flex-1 w-full">
              <h2 className="text-3xl font-bold font-serif mb-2 text-gray-900">{viewProduct?.name}</h2>
              <p className="text-sm text-gray-600 mb-6">{viewProduct?.description}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-8 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Category</p>
                  <p className="text-base font-medium text-gray-800">{viewProduct?.category?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Price</p>
                  <p className="text-base font-medium text-gray-800">₹{viewProduct?.price}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Current Stock</p>
                  <p className="text-base font-medium text-gray-800">
                    {(() => {
                      const productVariants = getProductVariants(viewProduct);
                      return productVariants.length > 0 
                        ? productVariants.reduce((acc, v) => acc + Math.max(0, (v.inventory || 0) - (v.reserveStock || 0)), 0)
                        : (viewProduct?.inventory?.stockQuantity || 0);
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">SKU</p>
                  <p className="text-base font-mono text-gray-800 bg-white px-2 py-1 rounded inline-block border border-gray-200">{getInventorySku(viewProduct, getProductVariants(viewProduct))}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* VARIANTS LIST IN DETAIL VIEW */}
          {viewProduct && getProductVariants(viewProduct).length > 0 && (
            <div className="mt-12">
              <h3 className="text-lg font-bold text-gray-800 uppercase tracking-widest mb-6 pb-2 border-b border-gray-200">Product Variants</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getProductVariants(viewProduct).map(v => {
                  const vStock = v.inventory || 0;
                  const vStatus = getStatus(vStock, 5);
                  return (
                    <div key={v._id} className="variant-card">
                      <div className="variant-card-header">
                        <div>
                          <p className="variant-card-title">{v.variantCombination}</p>
                          <p className="variant-card-sku">{v.sku || 'No SKU'}</p>
                        </div>
                        <span className={`status-badge ${vStatus.class}`}>
                          {vStatus.label}
                        </span>
                      </div>

                      <div className="variant-card-stats">
                        <div className="variant-stat">
                          <p className="variant-stat-label">Total Stock</p>
                          <p className="variant-stat-value">{vStock}</p>
                        </div>
                        <div className="variant-stat">
                          <p className="variant-stat-label">Current Stock</p>
                          <p className="variant-stat-value">{Math.max(0, (v.inventory || 0) - (v.reserveStock || 0))}</p>
                        </div>
                        <div className="variant-stat">
                          <p className="variant-stat-label">Reserve Stock</p>
                          <p className="variant-stat-value">{v.reserveStock || 0}</p>
                        </div>
                      </div>

                      <div className="variant-card-actions">
                        {canEdit && (
                        <button className="variant-action-btn" title="Add Stock" onClick={() => openAddStockModal(v, 'variant')}>
                          <Plus size={14}/> Add
                        </button>
                        )}
                        {canEdit && (
                        <button className="variant-action-btn secondary" title="Edit Stock" onClick={() => openEditModal(v, 'variant')}>
                          <Edit2 size={14}/> Edit
                        </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
      <div className="inventory-main-layout mt-6">
        <div className="inventory-tables-section">
          
          {products.length === 0 ? (
            <div className="empty-state-container h-64 flex flex-col items-center justify-center bg-white rounded-2xl border border-gray-200">
                <div className="empty-icon-wrapper mb-4">
                  <Boxes className="text-gray-400" size={48} />
                </div>
                <h2 className="text-lg font-bold text-gray-800">No inventory available.</h2>
                <p className="text-sm text-gray-500 mb-6">Get started by adding products to your catalog.</p>
            </div>
          ) : (
            <>
              {/* MAIN INVENTORY TABLE */}
              <div className="table-container">
                <div className="table-header-section">
                  <h2 className="table-title">Main Inventory</h2>
                </div>
                <div className="table-responsive">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Category</th>
                        <th>SKU</th>
                        <th className="text-right">Stock</th>
                        <th>Status</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((item) => {
                        const productVariants = getProductVariants(item);
                        const currentStock = productVariants.length > 0
                          ? productVariants.reduce((acc, v) => acc + Math.max(0, (v.inventory || 0) - (v.reserveStock || 0)), 0)
                          : (item.inventory?.stockQuantity || 0);
                        const status = currentStock === 0 ? { label: 'Out of Stock', class: 'status-out-of-stock' } : (item.isLowStock ? { label: 'Low Stock', class: 'status-low-stock' } : { label: 'In Stock', class: 'status-in-stock' });

                        return (
                          <React.Fragment key={item._id}>
                            <tr className={productVariants.length > 0 ? "border-b-0" : ""}>
                              <td>
                                <div className="product-cell">
                                  <ProductThumbnail src={getInventoryImage(item, productVariants)} alt={item.name} />
                                  <span className="product-name">{item.name}</span>
                                </div>
                              </td>
                              <td className="capitalize">{item.category?.name || 'General'}</td>
                              <td><code className="sku-code">{getInventorySku(item, productVariants)}</code></td>
                              <td className="text-right font-semibold">{currentStock}</td>
                              <td>
                                <span className={`status-badge ${status.class}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td>
                                <div className="action-buttons">
                                  {canEdit && (
                                  <button className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors" title="Add Stock" onClick={() => openAddStockModal(item, 'product')}>
                                    <Plus size={16}/>
                                  </button>
                                  )}
                                  <button className="p-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors" title="View" onClick={() => openViewModal(item)}><Eye size={16}/></button>
                                  {canEdit && (
                                  <button className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors" title="Edit Stock" onClick={() => openEditModal(item, 'product')}><Edit2 size={16}/></button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* VARIANT INVENTORY MERGED ABOVE */}
            </>
          )}

        </div>

        {/* LOW STOCK ALERT PANEL */}
        <div className="alert-panel-section">
          <div className="alert-widget">
            <div className="alert-widget-header">
              <AlertTriangle className="text-orange-500" size={20} />
              <h3 className="alert-title">Low Stock Alerts</h3>
            </div>
            <div className="alert-list">
              {products.filter(p => p.inventory?.stockQuantity <= 5).slice(0, 5).map(p => (
                <div key={p._id} className={`alert-item ${p.inventory?.stockQuantity === 0 ? 'danger' : 'warning'}`}>
                  <div className="alert-item-info">
                    <p className="alert-item-name">{p.name}</p>
                    <p className="alert-item-variant">SKU: {getInventorySku(p, getProductVariants(p))}</p>
                  </div>
                  <div className="alert-item-stock">
                    <span className="label">Remaining</span>
                    <span className="value">{p.inventory?.stockQuantity || 0}</span>
                  </div>
                </div>
              ))}
              {products.filter(p => p.inventory?.stockQuantity <= 5).length === 0 && (
                <div className="p-4 text-sm text-gray-500">All products are well stocked.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* EDIT MODAL */}
      {editModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <div className="modal-header flex justify-between items-center pb-3 border-b border-[#E6DFD4]">
              <h3 className="modal-title font-bold">Edit Stock</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setEditModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="p-6 space-y-4">
                <p className="text-sm font-medium mb-4 text-gray-700">
                  Updating stock for: <span className="font-bold">{editItem?.type === 'product' ? editItem?.data?.name : `${editItem?.data?.productName} (${editItem?.data?.sku})`}</span>
                </p>
                {editItem?.type === 'product' && getProductVariants(editItem?.data).length > 0 && (
                  <div className="space-y-2 mb-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-brand-medium">Select Variant</label>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => {
                        const vId = e.target.value;
                        setSelectedVariantId(vId);
                        const v = getProductVariants(editItem?.data).find(x => x._id === vId);
                        if (v) {
                          setEditStock(v.inventory || 0);
                          setEditCurrentStock(v.currentStock || 0);
                          setEditReserveStock(v.reserveStock || 0);
                        }
                      }}
                      className="w-full border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-medium bg-white"
                    >
                      {getProductVariants(editItem?.data).map(v => (
                        <option key={v._id} value={v._id}>
                          {v.variantCombination} ({v.sku || 'No SKU'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}                 <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-brand-medium">
                      {(editItem?.type === 'variant' || getProductVariants(editItem?.data).length > 0) ? 'Total Stock' : 'Current Stock'}
                    </label>
                    <input 
                      type="number" 
                      min="0"
                      value={editStock} 
                      onChange={(e) => setEditStock(e.target.value)}
                      className="w-full border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-medium"
                    />
                  </div>
                  {(editItem?.type === 'variant' || getProductVariants(editItem?.data).length > 0) && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-brand-medium">Current Stock</label>
                        <input 
                          type="number" 
                          value={Math.max(0, parseInt(editStock || 0) - parseInt(editReserveStock || 0))} 
                          disabled
                          className="w-full border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-brand-medium">Reserve Stock</label>
                        <input 
                          type="number" 
                          min="0"
                          value={editReserveStock} 
                          onChange={(e) => setEditReserveStock(e.target.value)}
                          className="w-full border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-medium"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setEditModalOpen(false)} className="px-4 py-2.5 text-xs uppercase font-bold tracking-wider text-brand-dark bg-white border border-[#E6DFD4] hover:bg-gray-50 rounded-xl">Cancel</button>
                  <button onClick={handleUpdateStock} className="px-5 py-2.5 text-xs uppercase font-bold tracking-wider bg-brand-dark text-white rounded-xl hover:bg-black transition-colors shadow-sm">Save Changes</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD STOCK MODAL */}
      {addStockModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '400px'}}>
            <div className="modal-header flex justify-between items-center pb-3 border-b border-[#E6DFD4]">
              <h3 className="modal-title font-bold">Add Stock</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setAddStockModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="p-6 space-y-4">
                <p className="text-sm font-medium mb-4 text-gray-700">
                  Adding stock for: <span className="font-bold">{addStockItem?.type === 'product' ? addStockItem?.data?.name : `${addStockItem?.data?.productName} (${addStockItem?.data?.sku})`}</span>
                </p>
                {addStockItem?.type === 'product' && getProductVariants(addStockItem?.data).length > 0 && (
                  <div className="space-y-2 mb-4">
                    <label className="text-xs font-bold uppercase tracking-widest text-brand-medium">Select Variant</label>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="w-full border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-medium bg-white"
                    >
                      {getProductVariants(addStockItem?.data).map(v => (
                        <option key={v._id} value={v._id}>
                          {v.variantCombination} ({v.sku || 'No SKU'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-brand-medium">Quantity to Add</label>
                  <input 
                    type="number" 
                    min="1"
                    value={addStockAmount} 
                    onChange={(e) => setAddStockAmount(e.target.value)}
                    className="w-full border border-[#E6DFD4] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-medium"
                    placeholder="e.g. 50"
                  />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={() => setAddStockModalOpen(false)} className="px-4 py-2.5 text-xs uppercase font-bold tracking-wider text-brand-dark bg-white border border-[#E6DFD4] hover:bg-gray-50 rounded-xl">Cancel</button>
                  <button onClick={handleAddStock} className="px-5 py-2.5 text-xs uppercase font-bold tracking-wider bg-brand-dark text-white rounded-xl hover:bg-black transition-colors shadow-sm">Add Stock</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
