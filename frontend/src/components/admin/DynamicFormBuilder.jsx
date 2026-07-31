import React from 'react';

export const DynamicFormBuilder = ({
    mappings = [], // Array of { attribute: { _id, name, type, values: [...] }, isRequired }
    values = {},   // Current state of attribute values: { [attributeId]: value/values }
    onChange       // Callback: (attributeId, value, extraProps = {}) => {}
}) => {
    if (!mappings || mappings.length === 0) {
        return (
            <div className="text-sm text-gray-500 py-4 bg-gray-50 rounded-xl text-center border border-dashed border-gray-200">
                No custom attributes configured for this subcategory.
            </div>
        );
    }

    const handleFieldChange = (attributeId, val, type) => {
        const payload = { value: undefined, values: undefined, numericValue: undefined, dateValue: undefined, booleanValue: undefined };

        if (type === 'Number') {
            payload.numericValue = val !== '' ? Number(val) : undefined;
            payload.value = val !== '' ? String(val) : undefined;
        } else if (type === 'Date') {
            payload.dateValue = val !== '' ? new Date(val) : undefined;
            payload.value = val !== '' ? String(val) : undefined;
        } else if (type === 'Boolean') {
            payload.booleanValue = Boolean(val);
            payload.value = Boolean(val) ? 'true' : 'false';
        } else if (type === 'MultiSelect' || type === 'Checkbox') {
            payload.values = Array.isArray(val) ? val : [val];
        } else {
            payload.value = val;
        }

        onChange(attributeId, payload);
    };

    const handleCheckboxToggle = (attributeId, optionValue, isChecked) => {
        const currentVals = Array.isArray(values[attributeId]?.values) ? [...values[attributeId].values] : [];
        let updated;
        if (isChecked) {
            updated = [...currentVals, optionValue];
        } else {
            updated = currentVals.filter(v => v !== optionValue);
        }
        handleFieldChange(attributeId, updated, 'Checkbox');
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mappings.map((map) => {
                const attr = map.attribute;
                if (!attr) return null;

                const attrId = attr._id;
                const attrName = attr.name;
                const attrType = attr.type;
                const isRequired = map.isRequired;
                const description = attr.description;

                // Extract current state value
                const currentState = values[attrId] || {};
                const currentVal = currentState.value || '';
                const currentVals = currentState.values || [];
                const currentNum = currentState.numericValue !== undefined ? currentState.numericValue : '';
                const currentDate = currentState.dateValue ? new Date(currentState.dateValue).toISOString().split('T')[0] : '';
                const currentBool = currentState.booleanValue !== undefined ? currentState.booleanValue : currentVal === 'true';

                return (
                    <div key={attrId} className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                            {attrName}
                            {isRequired && <span className="text-red-500">*</span>}
                        </label>

                        {/* Input controls based on type */}
                        {attrType === 'Text' && (
                            <input
                                type="text"
                                value={currentVal}
                                onChange={(e) => handleFieldChange(attrId, e.target.value, 'Text')}
                                required={isRequired}
                                placeholder={`Enter ${attrName.toLowerCase()}`}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                            />
                        )}

                        {attrType === 'Textarea' && (
                            <textarea
                                value={currentVal}
                                onChange={(e) => handleFieldChange(attrId, e.target.value, 'Textarea')}
                                required={isRequired}
                                rows={3}
                                placeholder={`Enter ${attrName.toLowerCase()}`}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                            />
                        )}

                        {attrType === 'Number' && (
                            <input
                                type="text" inputMode="numeric"
                                value={currentNum}
                                onChange={(e) => handleFieldChange(attrId, e.target.value, 'Number')}
                                required={isRequired}
                                placeholder="0.00"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                            />
                        )}

                        {attrType === 'Date' && (
                            <input
                                type="date"
                                value={currentDate}
                                onChange={(e) => handleFieldChange(attrId, e.target.value, 'Date')}
                                required={isRequired}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                            />
                        )}

                        {attrType === 'Dropdown' && (
                            <select
                                value={currentVal}
                                onChange={(e) => handleFieldChange(attrId, e.target.value, 'Dropdown')}
                                required={isRequired}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                            >
                                <option value="">Select option</option>
                                {(attr.values || []).map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.value}
                                    </option>
                                ))}
                            </select>
                        )}

                        {attrType === 'MultiSelect' && (
                            <select
                                multiple
                                value={currentVals}
                                onChange={(e) => {
                                    const opts = Array.from(e.target.selectedOptions, option => option.value);
                                    handleFieldChange(attrId, opts, 'MultiSelect');
                                }}
                                required={isRequired}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm min-h-[100px]"
                            >
                                {(attr.values || []).map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.value}
                                    </option>
                                ))}
                            </select>
                        )}

                        {attrType === 'RadioButton' && (
                            <div className="flex flex-wrap gap-4 py-1.5">
                                {(attr.values || []).map((opt) => (
                                    <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={`radio-${attrId}`}
                                            value={opt.value}
                                            checked={currentVal === opt.value}
                                            onChange={(e) => handleFieldChange(attrId, e.target.value, 'RadioButton')}
                                            required={isRequired && !currentVal}
                                            className="text-amber-600 focus:ring-amber-500"
                                        />
                                        {opt.value}
                                    </label>
                                ))}
                            </div>
                        )}

                        {attrType === 'Checkbox' && (
                            <div className="flex flex-col gap-2 py-1">
                                {(attr.values || []).map((opt) => (
                                    <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            value={opt.value}
                                            checked={currentVals.includes(opt.value)}
                                            onChange={(e) => handleCheckboxToggle(attrId, opt.value, e.target.checked)}
                                            required={isRequired && currentVals.length === 0}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        {opt.value}
                                    </label>
                                ))}
                            </div>
                        )}

                        {attrType === 'Boolean' && (
                            <label className="inline-flex items-center gap-3 text-sm font-medium text-gray-700 cursor-pointer py-2">
                                <input
                                    type="checkbox"
                                    checked={currentBool}
                                    onChange={(e) => handleFieldChange(attrId, e.target.checked, 'Boolean')}
                                    className="rounded text-amber-600 focus:ring-amber-500"
                                />
                                Enabled
                            </label>
                        )}

                        {(attrType === 'File' || attrType === 'Image') && (
                            <input
                                type="url"
                                value={currentVal}
                                onChange={(e) => handleFieldChange(attrId, e.target.value, attrType)}
                                required={isRequired}
                                placeholder={attrType === 'Image' ? 'https://example.com/image.jpg' : 'https://example.com/file.pdf'}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                            />
                        )}

                        {attrType === 'ColorPicker' && (
                            <div className="flex flex-wrap gap-3 py-1">
                                {(attr.values || []).map((opt) => {
                                    const isSelected = currentVal === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => handleFieldChange(attrId, opt.value, 'ColorPicker')}
                                            style={{ backgroundColor: opt.colorCode || '#ccc' }}
                                            title={opt.value}
                                            className={`w-8 h-8 rounded-full border-2 transition-all relative ${
                                                isSelected 
                                                    ? 'border-amber-700 scale-110 shadow-md ring-2 ring-amber-500/20' 
                                                    : 'border-white hover:scale-105 shadow-sm'
                                            }`}
                                        >
                                            {isSelected && (
                                                <span className="absolute inset-0 flex items-center justify-center text-white font-bold drop-shadow-sm text-xs">
                                                    ✓
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {description && (
                            <span className="text-gray-400 text-xs">{description}</span>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default DynamicFormBuilder;
