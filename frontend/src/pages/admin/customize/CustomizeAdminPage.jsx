import React from 'react';
import CustomizeList from './CustomizeList';
import CustomizeFieldManager from './CustomizeFieldManager';

export default function CustomizeAdminPage({ activeSubTab, canCreate = true, canEdit = true, canDelete = true }) {
  return (
    <div className="space-y-6">
      {activeSubTab === 'list' && <CustomizeList canEdit={canEdit} canDelete={canDelete} />}
      {activeSubTab === 'form-fields' && <CustomizeFieldManager canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />}
    </div>
  );
}
