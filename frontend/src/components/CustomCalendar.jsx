import React, { useState } from 'react';

const CustomCalendar = ({ selectedDate, onSelectDate, config, isAdminMode, onToggleAdminDate, canEdit = true }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysArray = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const numDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const days = [];

    // Padding for first row
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= numDays; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const isDateStatus = (dateObj) => {
    if (!dateObj) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dateObj.setHours(0, 0, 0, 0);

    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // Admin Specific Settings
    const specificBlocked = config?.specificBlockedDates || [];
    const specificAvailable = config?.specificAvailableDates || [];

    if (specificBlocked.includes(dateStr)) return 'blocked-manual';
    if (specificAvailable.includes(dateStr)) return 'available-manual';

    // Baseline calculation
    const disabledDays = config?.disabledNextDays || 3;
    const availableWindow = config?.availableDaysWindow || 3;

    const diffTime = dateObj - today;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= disabledDays && diffDays < disabledDays + availableWindow) {
      return 'available-baseline';
    }
    return 'blocked-baseline';
  };

  const handleDateClick = (dateObj) => {
    if (!dateObj) return;
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const status = isDateStatus(dateObj);

    if (isAdminMode) {
      if (canEdit && onToggleAdminDate) {
        onToggleAdminDate(dateStr, status);
      }
    } else {
      if (status === 'available-baseline' || status === 'available-manual') {
        if (onSelectDate) onSelectDate(dateStr);
      }
    }
  };

  const days = getDaysArray();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="w-full bg-white rounded-md select-none border border-gray-100 p-2">
      <div className="flex justify-between items-center mb-4 px-2 pt-2">
        <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600 font-bold">&lt;</button>
        <span className="font-semibold text-gray-800 text-sm">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
        <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600 font-bold">&gt;</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((dateObj, idx) => {
          if (!dateObj) return <div key={`empty-${idx}`} className="p-2"></div>;
          
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          const status = isDateStatus(dateObj);
          
          let btnClass = "w-full aspect-square flex items-center justify-center text-xs rounded transition-colors duration-200 ";
          
          const isSelected = selectedDate === dateStr;

          if (isAdminMode) {
            if (canEdit) {
              btnClass += "cursor-pointer ";
              if (status === 'blocked-manual') btnClass += "bg-red-100 text-red-700 border border-red-300 font-bold hover:bg-red-200 ";
              else if (status === 'available-manual') btnClass += "bg-green-100 text-green-700 border border-green-300 font-bold hover:bg-green-200 ";
              else if (status === 'available-baseline') btnClass += "bg-blue-50 text-blue-700 hover:bg-blue-100 ";
              else btnClass += "text-gray-400 hover:bg-gray-50 ";
            } else {
              btnClass += "cursor-not-allowed ";
              if (status === 'blocked-manual') btnClass += "bg-red-50 text-red-700 border border-red-200 font-bold opacity-70 ";
              else if (status === 'available-manual') btnClass += "bg-green-50 text-green-700 border border-green-200 font-bold opacity-70 ";
              else if (status === 'available-baseline') btnClass += "bg-blue-50 text-blue-700 opacity-70 ";
              else btnClass += "text-gray-400 opacity-70 ";
            }
          } else {
            if (status === 'available-baseline' || status === 'available-manual') {
              btnClass += "cursor-pointer font-medium hover:bg-gray-100 ";
              if (isSelected) {
                btnClass += "bg-black text-white hover:bg-gray-800 ";
              } else {
                btnClass += "text-gray-800 bg-gray-50 ";
              }
            } else {
              btnClass += "cursor-not-allowed text-gray-300 ";
            }
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(dateObj)}
              className={btnClass}
              disabled={(!isAdminMode && !(status === 'available-baseline' || status === 'available-manual')) || (isAdminMode && !canEdit)}
            >
              {dateObj.getDate()}
            </button>
          );
        })}
      </div>
      
      {isAdminMode && (
        <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded-sm"></div><span className="text-gray-600">Auto Available</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-100 border border-green-300 rounded-sm"></div><span className="text-gray-600">Manual Available</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-white border border-gray-200 rounded-sm"></div><span className="text-gray-600">Auto Blocked</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-100 border border-red-300 rounded-sm"></div><span className="text-gray-600">Manual Blocked</span></div>
        </div>
      )}
    </div>
  );
};

export default CustomCalendar;
