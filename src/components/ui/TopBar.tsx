import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore, useSettingsStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';
import type { ViewMode } from '../../types';

export function TopBar() {
  const { searchQuery, setSearchQuery, viewMode, setViewMode, setSettingsPanelOpen } = useUIStore();
  const { gridCardSize, updateSettings } = useSettingsStore();
  const theme = useTheme();
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
        <SearchInput value={localSearch} onChange={setLocalSearch} theme={theme} />
      </div>

      {/* View Mode Toggle */}
      <div
        className="flex items-center gap-1 rounded-lg p-1"
        style={{ backgroundColor: 'var(--theme-surface)' }}
      >
        <ViewModeButton
          mode="grid"
          currentMode={viewMode}
          onClick={() => setViewMode('grid')}
          icon={<GridIcon />}
          tooltip="Grid View"
          theme={theme}
        />
        <ViewModeButton
          mode="list"
          currentMode={viewMode}
          onClick={() => setViewMode('list')}
          icon={<ListIcon />}
          tooltip="List View"
          theme={theme}
        />
        <ViewModeButton
          mode="3d-shelf"
          currentMode={viewMode}
          onClick={() => setViewMode('3d-shelf')}
          icon={<ShelfIcon />}
          tooltip="3D Shelf View"
          theme={theme}
        />
      </div>

      {/* Grid Size Slider - Only visible in grid view */}
      <AnimatePresence>
        {viewMode === 'grid' && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <ZoomOutIcon className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
            <input
              type="range"
              min={120}
              max={280}
              step={10}
              value={gridCardSize}
              onChange={(e) => updateSettings({ gridCardSize: Number(e.target.value) })}
              className="w-24 h-1.5 rounded-full appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-all
                         [&::-webkit-slider-thumb]:hover:scale-125"
              style={{
                backgroundColor: 'var(--theme-border)',
                // @ts-ignore - CSS variable for thumb color
                '--slider-thumb-color': theme.accent,
              } as React.CSSProperties}
              title={`Card size: ${gridCardSize}px`}
            />
            <ZoomInIcon className="w-4 h-4" style={{ color: 'var(--theme-text-muted)' }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setSettingsPanelOpen(true)}
        className="p-2 rounded-lg transition-colors"
        style={{
          backgroundColor: 'var(--theme-surface)',
          color: 'var(--theme-text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--theme-surface-hover)';
          e.currentTarget.style.color = theme.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--theme-surface)';
          e.currentTarget.style.color = 'var(--theme-text-secondary)';
        }}
      >
        <SettingsIcon />
      </motion.button>
    </div>
  );
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  theme: ReturnType<typeof useTheme>;
}

function SearchInput({ value, onChange, theme }: SearchInputProps) {
  return (
    <div className="relative">
      <div
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        <SearchIcon />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search games..."
        className="w-full pl-10 pr-4 py-2 rounded-lg font-body text-sm transition-all duration-200 focus:outline-none focus:shadow-lg"
        style={{
          backgroundColor: 'var(--theme-surface)',
          border: '1px solid var(--theme-border)',
          color: 'var(--theme-text)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = theme.accent;
          e.currentTarget.style.boxShadow = `0 0 10px ${theme.accentMuted}`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--theme-border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      />
      {value && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: 'var(--theme-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--theme-text)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--theme-text-muted)'; }}
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
  theme: ReturnType<typeof useTheme>;
}

function ViewModeButton({ mode, currentMode, onClick, icon, tooltip, theme }: ViewModeButtonProps) {
  const isActive = mode === currentMode;

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={tooltip}
      className="p-2 rounded-md transition-all duration-200"
      style={{
        backgroundColor: isActive ? theme.accentMuted : 'transparent',
        color: isActive ? theme.accent : 'var(--theme-text-muted)',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--theme-surface-hover)';
          e.currentTarget.style.color = 'var(--theme-text)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--theme-text-muted)';
        }
      }}
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

function ZoomOutIcon({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
  );
}

function ZoomInIcon({ className = 'w-4 h-4', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
    </svg>
  );
}
