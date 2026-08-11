import React from 'react';

export const BulkActions = ({
    selectedIds = [],
    onBulkDelete,
    onBulkStatusChange,
    onClear,
    loading = false
}) => {
    if (selectedIds.length === 0) return null;

    return (
        <div className="bg-[#F8F4EC] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-[#8B5E3C]">
                {selectedIds.length} selected
            </span>
            <div className="flex gap-2 ml-auto flex-wrap">
                {onBulkStatusChange && (
                    <>
                        <button
                            onClick={() => onBulkStatusChange(true)}
                            disabled={loading}
                            className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                        >
                            Set Active
                        </button>
                        <button
                            onClick={() => onBulkStatusChange(false)}
                            disabled={loading}
                            className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            Set Inactive
                        </button>
                    </>
                )}
                {onBulkDelete && (
                    <button
                        onClick={onBulkDelete}
                        disabled={loading}
                        className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                        Delete Selected
                    </button>
                )}
                <button
                    onClick={onClear}
                    className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500"
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

export default BulkActions;
