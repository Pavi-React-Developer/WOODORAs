import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

const CustomDropdown = ({ options, value, onChange, className = '', buttonClassName = '', dropdownClassName = '', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState({});

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        buttonRef.current && !buttonRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      updatePosition();
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'absolute',
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
        zIndex: 99999,
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', updatePosition);
    // capture all scroll events
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => (typeof opt === 'object' ? opt.value === value : opt === value));
  const displayLabel = selectedOption ? (typeof selectedOption === 'object' ? selectedOption.label : selectedOption) : (value || 'Select Option');

  return (
    <div className={`relative inline-block w-full text-left ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between bg-white focus:outline-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${buttonClassName || 'px-4 py-2 rounded-xl border border-[#E6DFD4]'}`}
      >
        <span className="truncate pr-2 text-sm font-medium text-gray-900">{displayLabel}</span>
        <ChevronDown size={16} className={`text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <ul 
          ref={dropdownRef} 
          style={dropdownStyle} 
          className={`bg-white border border-[#E6DFD4] rounded-xl shadow-lg max-h-60 overflow-auto py-1 ${dropdownClassName}`}
        >
          {options.map((option, idx) => {
            const optVal = typeof option === 'object' ? option.value : option;
            const optLabel = typeof option === 'object' ? option.label : option;
            const optDisabled = typeof option === 'object' ? option.disabled : false;
            const isSelected = optVal === value;
            return (
              <li
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!optDisabled) {
                    onChange(optVal);
                    setIsOpen(false);
                  }
                }}
                className={`px-4 py-2.5 text-sm transition-colors ${
                  optDisabled
                    ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400'
                    : isSelected 
                      ? 'cursor-pointer bg-[#8B5E3C] text-white font-medium' 
                      : 'cursor-pointer text-gray-700 hover:bg-[#F8F4EC] hover:text-[#8B5E3C]'
                }`}
              >
                {optLabel}
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
};

export default CustomDropdown;
