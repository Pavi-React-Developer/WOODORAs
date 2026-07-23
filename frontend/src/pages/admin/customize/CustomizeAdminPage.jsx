import React from 'react';
import CustomizeList from './CustomizeList';
import CustomizeFieldManager from './CustomizeFieldManager';

export default function CustomizeAdminPage({ activeSubTab }) {
  return (
    <div className="space-y-6">
      {activeSubTab === 'list' && <CustomizeList />}
      {activeSubTab === 'add' && <CustomizeFieldManager />}
    </div>
  );
}
