import React, { useState, useEffect, useRef } from 'react';
import { cmsService } from '../../../api/cmsService';
import { productV2API, categoryV2API } from '../../../api/catalogV2Service';
import { Pencil, Trash2, Plus, GripVertical, Eye, EyeOff, Loader2, Upload, X, ChevronDown } from 'lucide-react';

function LogoUploader({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await cmsService.uploadImages([file]);
      onChange(res.data[0]); // pass object
    } catch (err) { alert(err.message); }
    finally { setUploading(false); }
  };

  const getMediaUrl = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    return val.url || '';
  };

  const url = getMediaUrl(value);

  return (
    <div>
      <div className="flex items-center gap-3 mt-1">
        {url ? (
          <div className="relative border border-[#E6DFD4] rounded-lg p-2 bg-gray-50">
            <img src={url} alt="logo" className="h-16 object-contain rounded" />
            <button type="button" onClick={() => onChange(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-sm"><X className="w-3 h-3" /></button>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current.click()}
            className="flex items-center justify-center w-full min-h-[100px] gap-2 border-2 border-dashed border-[#E6DFD4] rounded-lg px-4 py-4 text-sm text-brand-medium hover:bg-[#F7F3EE] hover:border-brand-dark transition-all">
            <div className="text-center flex flex-col items-center">
                <Upload className="w-5 h-5 mb-2 text-brand-medium" /> 
                <span className="font-medium text-brand-dark">{uploading ? 'Uploading...' : 'Click to Upload Logo'}</span>
                <span className="text-[10px] mt-1 text-brand-medium block">PNG/SVG recommended</span>
            </div>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

const emptyItem = { title: '', url: '', icon: '', textColor: '', backgroundColor: '', isDropdown: false, order: 0, status: true };

export default function NavbarAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [showItemForm, setShowItemForm] = useState(false);
  const [currentItem, setCurrentItem] = useState(emptyItem);
  const [editIndex, setEditIndex] = useState(null);
  const [saving, setSaving] = useState(false);
  const [catalogItems, setCatalogItems] = useState({ categories: [], products: [] });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const fetchConfig = async () => {
    try {
      const res = await cmsService.getNavbar();
      if (res.success) setConfig(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchEntities = async () => {
      try {
        const [catRes, prodRes] = await Promise.all([
          categoryV2API.getAll({ limit: 200 }),
          productV2API.getAll({ limit: 500 })
        ]);
        setCatalogItems({
          categories: catRes.categories || [],
          products: prodRes.products || []
        });
      } catch (err) {
        console.error('Failed to fetch catalog items', err);
      }
    };
    fetchEntities();
    fetchConfig();
  }, []);

  const handleGlobalChange = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await cmsService.updateNavbar(config);
      alert('Navbar settings saved successfully!');
      fetchConfig();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleItemSubmit = (e) => {
    e.preventDefault();
    const newItems = [...(config.items || [])];
    if (editIndex !== null) {
      newItems[editIndex] = currentItem;
    } else {
      newItems.push(currentItem);
    }
    setConfig(prev => ({ ...prev, items: newItems }));
    setShowItemForm(false);
    setCurrentItem(emptyItem);
    setEditIndex(null);
  };

  const handleEditItem = (item, index) => {
    setCurrentItem(item);
    setEditIndex(index);
    setShowItemForm(true);
  };

  const handleDeleteItem = (index) => {
    if (!confirm('Delete this menu item?')) return;
    const newItems = [...(config.items || [])];
    newItems.splice(index, 1);
    setConfig(prev => ({ ...prev, items: newItems }));
  };

  const handleToggleItemStatus = (index) => {
    const newItems = [...(config.items || [])];
    newItems[index].status = !newItems[index].status;
    setConfig(prev => ({ ...prev, items: newItems }));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-brand-medium" /></div>;
  }

  return (
    <div className="space-y-8 bg-[#EFEBE4] p-6 md:p-8 rounded-2xl min-h-screen -mx-4 sm:-mx-6 -my-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-dark">Navbar Configuration</h3>
      </div>

      {/* Global Settings */}
      <div className="bg-white rounded-2xl border border-[#E6DFD4] p-6 shadow-sm">
        <h4 className="font-semibold text-brand-dark mb-4">Global Settings</h4>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-2">Navbar Logo</label>
            <LogoUploader 
              value={config?.logo} 
              onChange={(val) => setConfig(prev => ({ ...prev, logo: val }))} 
            />
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Logo CTA URL</label>
              <input 
                type="text"
                value={config?.logoUrl || ''} 
                onChange={e => handleGlobalChange('logoUrl', e.target.value)}
                className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" 
                placeholder="e.g. / (Home Page)" 
              />
              <p className="text-[10px] text-brand-medium mt-1">Where the logo redirects when clicked.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Logo Position</label>
              <select
                value={config?.logoPosition || 'left'}
                onChange={e => handleGlobalChange('logoPosition', e.target.value)}
                className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Navbar Background Color</label>
                <input type="color" value={config?.backgroundColor || '#ffffff'} onChange={e => handleGlobalChange('backgroundColor', e.target.value)}
                  className="w-full h-9 border border-[#E6DFD4] rounded-lg p-1 cursor-pointer" />
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Navbar Text Color</label>
                <input type="color" value={config?.textColor || '#4A3326'} onChange={e => handleGlobalChange('textColor', e.target.value)}
                  className="w-full h-9 border border-[#E6DFD4] rounded-lg p-1 cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Items Section */}
      <div className="flex items-center justify-between mt-8">
        <h3 className="text-lg font-bold text-brand-dark">Menu Items</h3>
        <button
          onClick={() => { setShowItemForm(true); setEditIndex(null); setCurrentItem(emptyItem); }}
          className="admin-btn flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Add/Edit Item Form */}
      {showItemForm && (
        <div className="bg-white rounded-2xl border border-brand-dark/20 p-6 shadow-md border-l-4 border-l-brand-dark">
          <h4 className="font-semibold text-brand-dark mb-4">{editIndex !== null ? 'Edit Menu Item' : 'Add New Menu Item'}</h4>
          <form onSubmit={handleItemSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Nav Title *</label>
              <input required value={currentItem.title} onChange={e => setCurrentItem({ ...currentItem, title: e.target.value })}
                className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="e.g. Shop" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">CTA URL *</label>
              <input required value={currentItem.url} onChange={e => setCurrentItem({ ...currentItem, url: e.target.value })}
                className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm" placeholder="e.g. /shop" />
            </div>
            <div className="relative">
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Auto-fill from Catalog</label>
              <button 
                type="button"
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="w-full border border-[#E6DFD4] rounded-lg px-3 py-2 text-sm bg-white text-left flex justify-between items-center"
              >
                Select Categories...
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
              
              {showCategoryDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-[#E6DFD4] rounded-lg mt-1 z-50 max-h-60 overflow-y-auto p-2 shadow-lg">
                  <div className="text-xs font-bold text-brand-medium uppercase mb-2 px-1">Categories</div>
                  {catalogItems.categories.map(cat => {
                    const isChecked = currentItem.subItems?.some(sub => sub.url === `/shop?category=${cat._id}`);
                    return (
                      <label key={cat._id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 cursor-pointer text-sm rounded">
                        <input 
                          type="checkbox" 
                          checked={isChecked} 
                          onChange={(e) => {
                            let newSubItems = [...(currentItem.subItems || [])];
                            if (e.target.checked) {
                               newSubItems.push({ title: cat.name, url: `/shop?category=${cat._id}` });
                            } else {
                               newSubItems = newSubItems.filter(sub => sub.url !== `/shop?category=${cat._id}`);
                            }
                            setCurrentItem({ ...currentItem, subItems: newSubItems, isDropdown: newSubItems.length > 0 || currentItem.isDropdown });
                          }} 
                        />
                        {cat.name}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Text Color (Optional)</label>
              <input type="color" value={currentItem.textColor || '#000000'} onChange={e => setCurrentItem({ ...currentItem, textColor: e.target.value })}
                className="w-full h-9 border border-[#E6DFD4] rounded-lg p-1 cursor-pointer" />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-medium uppercase tracking-wider block mb-1">Background Color (Optional)</label>
              <input type="color" value={currentItem.backgroundColor || '#ffffff'} onChange={e => setCurrentItem({ ...currentItem, backgroundColor: e.target.value })}
                className="w-full h-9 border border-[#E6DFD4] rounded-lg p-1 cursor-pointer" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="navbar-dropdown" checked={currentItem.isDropdown} onChange={e => setCurrentItem({ ...currentItem, isDropdown: e.target.checked })} />
              <label htmlFor="navbar-dropdown" className="text-sm font-semibold text-brand-dark cursor-pointer">Is Dropdown Menu?</label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="navbar-status" checked={currentItem.status} onChange={e => setCurrentItem({ ...currentItem, status: e.target.checked })} />
              <label htmlFor="navbar-status" className="text-sm text-brand-dark cursor-pointer">Active</label>
            </div>
            
            {currentItem.isDropdown && (
              <div className="sm:col-span-2 lg:col-span-3 border border-[#E6DFD4] p-4 rounded-lg bg-gray-50 mt-2">
                <div className="flex justify-between items-center mb-4">
                  <h5 className="font-semibold text-brand-dark text-sm">Dropdown Options</h5>
                  <button type="button" onClick={() => {
                    const newSubItems = [...(currentItem.subItems || []), { title: '', url: '' }];
                    setCurrentItem({ ...currentItem, subItems: newSubItems });
                  }} className="text-xs bg-white border border-[#E6DFD4] px-3 py-1 rounded text-brand-dark hover:bg-gray-100">+ Add Option</button>
                </div>
                {(!currentItem.subItems || currentItem.subItems.length === 0) && (
                  <p className="text-xs text-brand-medium italic text-center">No options added yet.</p>
                )}
                <div className="space-y-3">
                  {(currentItem.subItems || []).map((subItem, sIdx) => (
                    <div key={sIdx} className="flex gap-2 items-center">
                      <input required placeholder="Option Title" value={subItem.title || ''} onChange={e => {
                        const newSubItems = [...currentItem.subItems];
                        newSubItems[sIdx].title = e.target.value;
                        setCurrentItem({ ...currentItem, subItems: newSubItems });
                      }} className="flex-1 border border-[#E6DFD4] rounded px-3 py-1 text-sm" />
                      <input required placeholder="URL (/path)" value={subItem.url || ''} onChange={e => {
                        const newSubItems = [...currentItem.subItems];
                        newSubItems[sIdx].url = e.target.value;
                        setCurrentItem({ ...currentItem, subItems: newSubItems });
                      }} className="flex-1 border border-[#E6DFD4] rounded px-3 py-1 text-sm" />
                      
                      <select 
                        className="w-40 border border-[#E6DFD4] rounded px-2 py-1 text-xs bg-white text-brand-medium"
                        value="" 
                        onChange={e => {
                          if (!e.target.value) return;
                          const [type, id] = e.target.value.split('|');
                          let title = '';
                          let url = '';
                          if (type === 'cat') {
                            const cat = catalogItems.categories.find(c => c._id === id);
                            if (cat) { title = cat.name; url = `/shop?category=${id}`; }
                          } else if (type === 'prod') {
                            const prod = catalogItems.products.find(p => p._id === id);
                            if (prod) { title = prod.name; url = `/product/${id}`; }
                          }
                          const newSubItems = [...currentItem.subItems];
                          newSubItems[sIdx].title = title;
                          newSubItems[sIdx].url = url;
                          setCurrentItem({ ...currentItem, subItems: newSubItems });
                        }}
                      >
                        <option value="">Auto-fill from...</option>
                        <optgroup label="Categories">
                          {catalogItems.categories.map(c => <option key={`cat|${c._id}`} value={`cat|${c._id}`}>{c.name}</option>)}
                        </optgroup>
                        <optgroup label="Products">
                          {catalogItems.products.map(p => <option key={`prod|${p._id}`} value={`prod|${p._id}`}>{p.name}</option>)}
                        </optgroup>
                      </select>

                      <button type="button" onClick={() => {
                        const newSubItems = currentItem.subItems.filter((_, i) => i !== sIdx);
                        setCurrentItem({ ...currentItem, subItems: newSubItems });
                      }} className="text-red-500 hover:bg-red-50 p-1 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 justify-end mt-2">
              <button type="button" onClick={() => setShowItemForm(false)}
                className="px-4 py-2 text-sm border border-[#E6DFD4] rounded-lg text-brand-medium hover:bg-gray-50">Cancel</button>
              <button type="submit"
                className="px-6 py-2 text-sm bg-brand-dark text-white rounded-lg hover:bg-black">
                {editIndex !== null ? 'Update Item' : 'Add Item'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Menu Items List */}
      <div className="bg-white rounded-2xl border border-[#E6DFD4] overflow-hidden shadow-sm">
        {(!config?.items || config.items.length === 0) ? (
          <div className="p-8 text-center text-brand-medium text-sm">No menu items yet. Add your first one!</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E6DFD4] bg-[#F7F3EE]">
                <th className="px-4 py-3 text-left text-xs font-bold text-brand-medium uppercase tracking-wider w-10">Order</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-brand-medium uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-brand-medium uppercase tracking-wider">URL</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-brand-medium uppercase tracking-wider">Style</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-brand-medium uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-brand-medium uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD4]">
              {config.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-[#F7F3EE] transition-colors">
                  <td className="px-4 py-3 text-brand-medium"><GripVertical className="w-4 h-4" /></td>
                  <td className="px-4 py-3 font-medium text-brand-dark flex items-center gap-2">
                    {item.title}
                    {item.isDropdown && <span className="text-[10px] bg-brand-light px-2 py-0.5 rounded-full text-brand-dark">Dropdown</span>}
                  </td>
                  <td className="px-4 py-3 text-brand-medium font-mono text-xs">{item.url}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {item.textColor && <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: item.textColor }} title="Text Color"></div>}
                      {item.backgroundColor && <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: item.backgroundColor }} title="Background Color"></div>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {item.status ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleToggleItemStatus(idx)} title="Toggle status"
                        className="p-1.5 rounded-lg hover:bg-[#E6DFD4] text-brand-medium transition-colors">
                        {item.status ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleEditItem(item, idx)} title="Edit item"
                        className="p-1.5 rounded-lg hover:bg-[#E6DFD4] text-brand-medium transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteItem(idx)} title="Delete item"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-end pt-4 pb-8 border-t border-[#E6DFD4]">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-8 py-3 bg-brand-dark text-white rounded-xl hover:bg-black disabled:opacity-50 transition-colors font-bold shadow-sm"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
