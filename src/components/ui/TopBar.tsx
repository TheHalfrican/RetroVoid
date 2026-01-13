import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../stores';
import type { ViewMode } from '../../types';

export function TopBar() {
  const { searchQuery, setSearchQuery, viewMode, setViewMode, setSettingsPanelOpen } = useUIStore();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);

  return (
    <div className="h-full px-4 flex items-center gap-4">
      {/* Search Bar */}
      <div className="flex-1 max-w-md">
        <SearchInput value={localSearch} onChange={setLocalSearch} />
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 bg-glass-white rounded-lg p-1">
        <ViewModeButton
          mode="grid"
          currentMode={viewMode}
          onClick={() => setViewMode('grid')}
          icon={<GridIcon />}
          tooltip="Grid View"
        />
        <ViewModeButton
          mode="list"
          currentMode={viewMode}
          onClick={() => setViewMode('list')}
          icon={<ListIcon />}
          tooltip="List View"
        />
        <ViewModeButton
          mode="3d-shelf"
          currentMode={viewMode}
          onClick={() => setViewMode('3d-shelf')}
          icon={<ShelfIcon />}
          tooltip="3D Shelf View"
        />
      </div>

      {/* Settings Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setSettingsPanelOpen(true)}
        className="p-2 rounded-lg bg-glass-white hover:bg-glass-border transition-colors text-gray-400 hover:text-neon-cyan"
      >
        <SettingsIcon />
      </motion.button>
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
        <SearchIcon />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search games..."
        className="w-full pl-10 pr-4 py-2 bg-glass-white border border-glass-border rounded-lg
                   font-body text-sm text-white placeholder-gray-500
                   focus:outline-none focus:border-neon-cyan focus:shadow-neon-cyan/20 focus:shadow-lg
                   transition-all duration-200"
      />
      {value && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
        >
          <CloseIcon />
        </motion.button>
      )}
    </div>
  );
}

interface ViewModeButtonProps {
  mode: ViewMode;
  currentMode: ViewMode;
  onClick: () => void;
  icon: React.ReactNode;
  tooltip: string;
}

function ViewModeButton({ mode, currentMode, onClick, icon, tooltip }: ViewModeButtonProps) {
  const isActive = mode === currentMode;

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={tooltip}
      className={`
        p-2 rounded-md transition-all duration-200
        ${isActive
          ? 'bg-neon-cyan/20 text-neon-cyan'
          : 'text-gray-500 hover:text-white hover:bg-glass-white'
        }
      `}
    >
      {icon}
    </motion.button>
  );
}

// Icons
function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zm-12 6h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zm-12 6h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
    </svg>
  );
}

function ShelfIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 4h16v2H4V4zm0 14h16v2H4v-2zm0-7h16v2H4v-2zm2-4v4h3V7H6zm5 0v4h3V7h-3zm5 0v4h3V7h-3z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
