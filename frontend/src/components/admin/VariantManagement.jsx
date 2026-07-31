import React, { useState, useEffect, useRef } from 'react';
import { Layers, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from './CommonComponents';
import ImageUploader from './ImageUploader';

const formatWeightInput = (value) => {
    if (value === '' || value === null || value === undefined) return '';
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(4) : value;
};

export const VariantManagement = ({
    variants = [],
    onChange,
    mappedAttributes = [],
    attributeValues = {},
    baseSku = '',
    basePrice = 0,
    baseCostPrice = 0,
    baseWeight = 0,
    baseDimensions = { length: 0, width: 0, height: 0 },
    baseImages = [],
}) => {
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
    const [expandedRows, setExpandedRows] = useState({});
    
    // Bulk Update States
    const [bulkPrice, setBulkPrice] = useState('');
    const [bulkInventory, setBulkInventory] = useState('');

    const variantsRef = useRef(variants);
    useEffect(() => {
        variantsRef.current = variants;
    }, [variants]);

    // Manual generation of combinations based on attributeValues
    const handleGenerateVariants = () => {
        const currentVariants = variantsRef.current;
        if (!mappedAttributes.length) return;
        
        const variantAttrs = mappedAttributes.filter(m => m.attribute?.isVariant);
        if (variantAttrs.length === 0) return;

        const optionsByAttr = [];
        variantAttrs.forEach(m => {
            const attrId = m.attribute._id || m.attribute;
            const payload = attributeValues[attrId];
            if (payload) {
                let selectedVals = [];
                if (payload.values && payload.values.length > 0) {
                    selectedVals = payload.values;
                } else if (payload.value) {
                    selectedVals = [payload.value];
                }
                
                if (selectedVals.length > 0) {
                    optionsByAttr.push({
                        attributeId: attrId,
                        attributeName: m.attribute.name,
                        values: selectedVals
                    });
                }
            }
        });

        if (optionsByAttr.length === 0) {
            if (currentVariants.length > 0) {
                onChange([]);
            }
            return;
        }

        const generateCartesianProduct = (arrays) => {
            if (arrays.length === 0) return [[]];
            return arrays.reduce((acc, curr) =>
                acc.flatMap(d => curr.values.map(v => [...d, { attribute: curr.attributeId, name: curr.attributeName, value: v }]))
            , [[]]);
        };

        const combinations = generateCartesianProduct(optionsByAttr);
        
        let hasChanges = false;
        const newVariants = combinations.map((combo, idx) => {
            const comboString = combo.map(c => c.value).join('-');
            
            const existing = currentVariants.find(v => {
                const existingCombo = String(v.variantCombination || '').trim().toLowerCase();
                const newCombo = String(comboString || '').trim().toLowerCase();
                if (existingCombo === newCombo) return true;
                
                if (v.options && Array.isArray(v.options) && v.options.length === combo.length) {
                    return combo.every(c => v.options.some(o => {
                        const valMatch = String(o.value || '').trim().toLowerCase() === String(c.value || '').trim().toLowerCase();
                        const attrMatch = String(o.attribute?._id || o.attribute) === String(c.attributeId || c.attribute);
                        return valMatch && attrMatch;
                    }));
                }
                return false;
            });
            
            if (existing) {
                if (existing.variantCombination !== comboString) {
                    hasChanges = true;
                }
                const vol = (Number(existing.length) || 0) * (Number(existing.width) || 0) * (Number(existing.height) || 0);
                if ((!existing.volume || existing.volume === 0) && vol > 0) {
                    hasChanges = true;
                    return { ...existing, variantCombination: comboString, volume: Number(vol.toFixed(2)) };
                }
                return { ...existing, variantCombination: comboString };
            }
            hasChanges = true;
            
            const primaryVariant = currentVariants.find(v => v.isPrimary) || currentVariants[0];
            
            let autoSku = baseSku ? `${baseSku}-${combo.map(c => c.value.substring(0, 4).toUpperCase()).join('-')}` : `VAR-${idx + 1}`;
            
            return {
                sku: autoSku,
                barcode: primaryVariant?.barcode || '',
                basePrice: primaryVariant?.basePrice ?? basePrice ?? 0,
                discountPrice: primaryVariant?.discountPrice ?? 0,
                costPrice: primaryVariant?.costPrice ?? baseCostPrice ?? 0,
                inventory: 0,
                weight: primaryVariant?.weight ?? formatWeightInput(baseWeight || 0),
                length: primaryVariant?.length ?? baseDimensions?.length ?? 0,
                width: primaryVariant?.width ?? baseDimensions?.width ?? 0,
                height: primaryVariant?.height ?? baseDimensions?.height ?? 0,
                volume: primaryVariant?.volume ?? 0,
                variantCombination: comboString,
                isActive: true,
                isPrimary: idx === 0,
                lowStockAlert: primaryVariant?.lowStockAlert ?? 5,
                images: primaryVariant?.images?.length ? [...primaryVariant.images] : [...(baseImages || [])],
                description: primaryVariant?.description || '',
                options: combo.map(c => ({
                    attribute: c.attribute,
                    value: c.value
                }))
            };
        });

        const newCombos = new Set(newVariants.map(v => v.variantCombination));
        const removedVariants = currentVariants.filter(v => !newCombos.has(v.variantCombination));
        
        if (removedVariants.length > 0) {
            const confirm = window.confirm(`You unselected options which removes ${removedVariants.length} variant(s). Are you sure?`);
            if (!confirm) {
                // To keep it simple, we don't block state desync if user cancels since checkboxes already unchecked.
            }
            hasChanges = true;
        }

        if (hasChanges || variants.length === 0) {
            onChange(newVariants);
        }
    };

    const handleFieldChange = (index, field, value) => {
        onChange(prevVariants => {
            const updated = [...prevVariants];
            updated[index] = { ...updated[index], [field]: value };
            
            if (['length', 'width', 'height'].includes(field)) {
                const v = updated[index];
                const vol = (Number(v.length) || 0) * (Number(v.width) || 0) * (Number(v.height) || 0);
                updated[index].volume = vol > 0 ? Number(vol.toFixed(2)) : 0;
            }
            return updated;
        });
    };

    const getDiscountPercentage = (variant) => {
        const base = Number(variant.basePrice || 0);
        const discounted = Number(variant.discountPrice || 0);
        if (!base || discounted <= 0 || discounted >= base) return '';
        return `${Math.round(((base - discounted) / base) * 100)}%`;
    };

    const handleBulkApply = (field, val) => {
        if (val === '') return;
        onChange(prevVariants => prevVariants.map(v => ({ ...v, [field]: Number(val) })));
    };

    const toggleRow = (idx) => {
        setExpandedRows(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    if (variants.length === 0) {
        return (
            <div className="border border-gray-200 rounded-xl p-8 text-center bg-gray-50 flex flex-col items-center">
                <Layers className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm text-gray-500 mb-4">Select custom specifications above, then generate variants.</p>
                <Button type="button" onClick={handleGenerateVariants} variant="primary">Generate Variants</Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" inputMode="numeric" 
                            placeholder="Bulk Price" 
                            value={bulkPrice}
                            onChange={e => setBulkPrice(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-32"
                        />
                        <Button type="button" size="sm" variant="outline" onClick={() => handleBulkApply('basePrice', bulkPrice)}>Apply</Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <input 
                            type="text" inputMode="numeric" 
                            placeholder="Bulk Inv." 
                            value={bulkInventory}
                            onChange={e => setBulkInventory(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-32"
                        />
                        <Button type="button" size="sm" variant="outline" onClick={() => handleBulkApply('inventory', bulkInventory)}>Apply</Button>
                    </div>
                    <Button type="button" size="sm" variant="primary" onClick={handleGenerateVariants}>Refresh Variants</Button>
                </div>
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button 
                        type="button" 
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-white shadow text-amber-700' : 'text-gray-600'}`}
                    >
                        Table
                    </button>
                    <button 
                        type="button"
                        onClick={() => setViewMode('card')} 
                        className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${viewMode === 'card' ? 'bg-white shadow text-amber-700' : 'text-gray-600'}`}
                    >
                        Cards
                    </button>
                </div>
            </div>

            {viewMode === 'table' ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1000px]">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                    <th className="px-4 py-3 w-10"></th>
                                    <th className="px-4 py-3 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 w-48">Variant</th>
                                    <th className="px-4 py-3">SKU</th>
                                    <th className="px-4 py-3 w-28">Price ($)</th>
                                    <th className="px-4 py-3 w-28">Inventory</th>
                                    <th className="px-4 py-3 w-24 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                {variants.map((variant, idx) => (
                                    <React.Fragment key={idx}>
                                        <tr className="hover:bg-amber-50/20 transition-colors">
                                            <td className="px-4 py-3 text-center">
                                                <button type="button" onClick={() => toggleRow(idx)} className="p-1 text-gray-400 hover:text-amber-600">
                                                    {expandedRows[idx] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 sticky left-0 bg-white z-10 border-r border-gray-100 font-medium text-gray-900 shadow-[1px_0_0_0_#f3f4f6]">
                                                {variant.variantCombination?.replace(/-/g, ' / ')}
                                                {variant.isPrimary && <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Primary</span>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={variant.sku}
                                                    onChange={(e) => handleFieldChange(idx, 'sku', e.target.value.toUpperCase())}
                                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-amber-500 font-mono"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text" inputMode="numeric"
                                                    value={variant.basePrice ?? ''}
                                                    onChange={(e) => handleFieldChange(idx, 'basePrice', e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-amber-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text" inputMode="numeric"
                                                    value={variant.inventory ?? ''}
                                                    onChange={(e) => handleFieldChange(idx, 'inventory', e.target.value)}
                                                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-amber-500"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleFieldChange(idx, 'isActive', !variant.isActive)}
                                                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                                                        variant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    {variant.isActive ? 'Active' : 'Draft'}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedRows[idx] && (
                                            <tr className="bg-gray-50/50">
                                                <td colSpan={6} className="p-6 border-b border-gray-200">
                                                    <div className="grid grid-cols-2 gap-8">
                                                        <div className="space-y-4">
                                                            <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Pricing & Logistics</h4>
                                                            <div className="grid grid-cols-2 gap-4">
                                                                <div className="flex flex-col gap-1"><span className="text-xs text-gray-500">Discount Price</span><input type="text" inputMode="numeric" value={variant.discountPrice ?? ''} onChange={e => handleFieldChange(idx, 'discountPrice', e.target.value)} className="p-2 border rounded text-sm"/></div>
                                                                <div className="flex flex-col gap-1"><span className="text-xs text-gray-500">Discount %</span><input type="text" value={getDiscountPercentage(variant)} readOnly className="p-2 border rounded text-sm bg-slate-50 text-slate-700"/></div>
                                                                <div className="flex flex-col gap-1"><span className="text-xs text-gray-500">Barcode</span><input type="text" value={variant.barcode ?? ''} onChange={e => handleFieldChange(idx, 'barcode', e.target.value)} className="p-2 border rounded text-sm"/></div>
                                                                <div className="flex flex-col gap-1"><span className="text-xs text-gray-500">Weight (kg)</span><input type="text" inputMode="numeric" step="0.0001" min="0" value={variant.weight ?? ''} onChange={e => handleFieldChange(idx, 'weight', e.target.value)} onBlur={e => handleFieldChange(idx, 'weight', formatWeightInput(e.target.value))} className="p-2 border rounded text-sm"/></div>
                                                                <div className="flex flex-col gap-1"><span className="text-xs text-gray-500">Length (cm)</span><input type="text" inputMode="numeric" value={variant.length ?? ''} onChange={e => handleFieldChange(idx, 'length', e.target.value)} className="p-2 border rounded text-sm"/></div>
                                                                <div className="flex flex-col gap-1"><span className="text-xs text-gray-500">Width (cm)</span><input type="text" inputMode="numeric" value={variant.width ?? ''} onChange={e => handleFieldChange(idx, 'width', e.target.value)} className="p-2 border rounded text-sm"/></div>
                                                                <div className="flex flex-col gap-1"><span className="text-xs text-gray-500">Height (cm)</span><input type="text" inputMode="numeric" value={variant.height ?? ''} onChange={e => handleFieldChange(idx, 'height', e.target.value)} className="p-2 border rounded text-sm"/></div>
                                                                <div className="flex flex-col gap-1"><span className="text-xs text-gray-500">Volume (cm³)</span><input type="text" value={variant.volume ?? 0} readOnly className="p-2 border rounded text-sm bg-slate-50 text-slate-700"/></div>
                                                                <div className="flex flex-col gap-1"><span className="text-xs text-gray-500">Low Stock Alert</span><input type="text" inputMode="numeric" value={variant.lowStockAlert ?? ''} onChange={e => handleFieldChange(idx, 'lowStockAlert', e.target.value)} className="p-2 border rounded text-sm"/></div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-4">
                                                            <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Variant Images</h4>
                                                            <ImageUploader 
                                                                images={variant.images || []}
                                                                onChange={(newImages) => handleFieldChange(idx, 'images', newImages)}
                                                                maxImages={4}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {variants.map((variant, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-center p-4 border-b border-gray-100">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                        {variant.variantCombination?.replace(/-/g, ' / ')}
                                        {variant.isPrimary && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider">Primary</span>}
                                    </h3>
                                    <p className="text-xs font-mono text-gray-500 mt-1">{variant.sku}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleFieldChange(idx, 'isActive', !variant.isActive)}
                                    className={`px-4 py-1.5 text-xs font-semibold rounded-full ${variant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {variant.isActive ? 'Active' : 'Draft'}
                                </button>
                            </div>
                            
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">Base Price</label>
                                            <input type="text" inputMode="numeric" value={variant.basePrice ?? ''} onChange={e => handleFieldChange(idx, 'basePrice', e.target.value)} className="p-2 border rounded text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">Discount Price</label>
                                            <input type="text" inputMode="numeric" value={variant.discountPrice ?? ''} onChange={e => handleFieldChange(idx, 'discountPrice', e.target.value)} className="p-2 border rounded text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">Discount %</label>
                                            <input type="text" value={getDiscountPercentage(variant)} readOnly className="p-2 border rounded text-sm bg-slate-50 text-slate-700 focus:outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">Inventory</label>
                                            <input type="text" inputMode="numeric" value={variant.inventory ?? ''} onChange={e => handleFieldChange(idx, 'inventory', e.target.value)} className="p-2 border rounded text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">Low Stock Alert</label>
                                            <input type="text" inputMode="numeric" value={variant.lowStockAlert ?? ''} onChange={e => handleFieldChange(idx, 'lowStockAlert', e.target.value)} className="p-2 border rounded text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">SKU</label>
                                            <input type="text" value={variant.sku ?? ''} onChange={e => handleFieldChange(idx, 'sku', e.target.value.toUpperCase())} className="p-2 border rounded text-sm font-mono focus:ring-1 focus:ring-amber-500 focus:outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">Barcode</label>
                                            <input type="text" value={variant.barcode ?? ''} onChange={e => handleFieldChange(idx, 'barcode', e.target.value)} className="p-2 border rounded text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">Weight (kg)</label>
                                            <input type="text" inputMode="numeric" step="0.0001" min="0" value={variant.weight ?? ''} onChange={e => handleFieldChange(idx, 'weight', e.target.value)} onBlur={e => handleFieldChange(idx, 'weight', formatWeightInput(e.target.value))} className="p-2 border rounded text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">Length (cm)</label>
                                            <input type="text" inputMode="numeric" value={variant.length ?? ''} onChange={e => handleFieldChange(idx, 'length', e.target.value)} className="p-2 border rounded text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">Width (cm)</label>
                                            <input type="text" inputMode="numeric" value={variant.width ?? ''} onChange={e => handleFieldChange(idx, 'width', e.target.value)} className="p-2 border rounded text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">Height (cm)</label>
                                            <input type="text" inputMode="numeric" value={variant.height ?? ''} onChange={e => handleFieldChange(idx, 'height', e.target.value)} className="p-2 border rounded text-sm focus:ring-1 focus:ring-amber-500 focus:outline-none"/>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <label className="text-xs text-gray-500">Volume (cm³)</label>
                                            <input type="text" value={variant.volume ?? 0} readOnly className="p-2 border rounded text-sm bg-slate-50 text-slate-700 focus:outline-none"/>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-gray-900 border-b pb-2">Variant Images</h4>
                                    <ImageUploader 
                                        images={variant.images || []}
                                        onChange={(newImages) => handleFieldChange(idx, 'images', newImages)}
                                        maxImages={4}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default VariantManagement;
