import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { open } from '@tauri-apps/plugin-dialog';
import { useUIStore, useSettingsStore, useLibraryStore } from '../../stores';
import { scanLibrary } from '../../services/library';
import type { ScanResult } from '../../services/library';

export function SettingsPanel() {
  const { settingsPanelOpen, setSettingsPanelOpen } = useUIStore();
  const settings = useSettingsStore();

  return (
    <AnimatePresence>
      {settingsPanelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSettingsPanelOpen(false)}
            className="fixed inset-0 bg-void-black/60 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-deep-purple border-l border-glass-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-glass-border flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">Settings</h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSettingsPanelOpen(false)}
                className="p-2 rounded-lg bg-glass-white hover:bg-glass-border text-gray-400 hover:text-white transition-colors"
              >
                <CloseIcon />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Library Section */}
              <LibraryScanSection />

              {/* Visual Effects */}
              <section>
                <h3 className="font-display text-sm text-neon-cyan uppercase tracking-wider mb-4">
                  Visual Effects
                </h3>
                <div className="space-y-4">
                  <ToggleSetting
                    label="Scanlines"
                    description="CRT-style scanline overlay"
                    value={settings.enableScanlines}
                    onChange={(v) => settings.updateSettings({ enableScanlines: v })}
                  />
                  <ToggleSetting
                    label="Particles"
                    description="Floating particle effects"
                    value={settings.enableParticles}
                    onChange={(v) => settings.updateSettings({ enableParticles: v })}
                  />
                  <ToggleSetting
                    label="3D Effects"
                    description="Enable 3D shelf view and effects"
                    value={settings.enable3DEffects}
                    onChange={(v) => settings.updateSettings({ enable3DEffects: v })}
                  />
                </div>
              </section>

              {/* Theme */}
              <section>
                <h3 className="font-display text-sm text-neon-cyan uppercase tracking-wider mb-4">
                  Theme
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <ThemeOption
                    name="Cyberpunk"
                    value="cyberpunk"
                    selected={settings.theme === 'cyberpunk'}
                    onClick={() => settings.updateSettings({ theme: 'cyberpunk' })}
                    color="#00f5ff"
                  />
                  <ThemeOption
                    name="Minimal"
                    value="minimal"
                    selected={settings.theme === 'minimal'}
                    onClick={() => settings.updateSettings({ theme: 'minimal' })}
                    color="#ffffff"
                  />
                  <ThemeOption
                    name="Retro CRT"
                    value="retro-crt"
                    selected={settings.theme === 'retro-crt'}
                    onClick={() => settings.updateSettings({ theme: 'retro-crt' })}
                    color="#00ff00"
                  />
                </div>
              </section>

              {/* Launch Settings */}
              <section>
                <h3 className="font-display text-sm text-neon-cyan uppercase tracking-wider mb-4">
                  Launch Settings
                </h3>
                <div className="space-y-4">
                  <ToggleSetting
                    label="Fullscreen"
                    description="Launch games in fullscreen mode"
                    value={settings.launchInFullscreen}
                    onChange={(v) => settings.updateSettings({ launchInFullscreen: v })}
                  />
                </div>
              </section>

              {/* About */}
              <section>
                <h3 className="font-display text-sm text-neon-cyan uppercase tracking-wider mb-4">
                  About
                </h3>
                <div className="bg-glass-white rounded-lg p-4 border border-glass-border">
                  <p className="font-display text-lg text-white mb-1">The Emulation Station</p>
                  <p className="font-body text-sm text-gray-500 mb-3">Version 0.1.0</p>
                  <p className="font-body text-xs text-gray-600">
                    A premium emulator launcher with holographic 3D visuals and cyberpunk aesthetics.
                  </p>
                </div>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface SelectedFolder {
  path: string;
  platformId?: string;
}

function LibraryScanSection() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<SelectedFolder[]>([]);
  const settings = useSettingsStore();
  const { platforms, loadLibrary } = useLibraryStore();

  // Open native folder picker
  const handleAddFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: true,
        title: 'Select Game Folders',
      });

      if (selected) {
        // Handle both single and multiple selections
        const paths = Array.isArray(selected) ? selected : [selected];
        // Filter out already selected paths
        const existingPaths = selectedFolders.map(f => f.path);
        const newFolders = paths
          .filter(p => !existingPaths.includes(p))
          .map(p => ({ path: p, platformId: undefined }));
        if (newFolders.length > 0) {
          setSelectedFolders([...selectedFolders, ...newFolders]);
        }
      }
    } catch (error) {
      console.error('Failed to open folder picker:', error);
    }
  };

  // Remove a path from selection
  const handleRemoveSelectedFolder = (path: string) => {
    setSelectedFolders(selectedFolders.filter(f => f.path !== path));
  };

  // Update platform for a folder
  const handleSetFolderPlatform = (path: string, platformId: string | undefined) => {
    setSelectedFolders(selectedFolders.map(f =>
      f.path === path ? { ...f, platformId } : f
    ));
  };

  // Scan selected folders
  const handleScan = async () => {
    if (selectedFolders.length === 0) return;

    setScanning(true);
    setScanResult(null);

    try {
      // Convert to ScanPath format
      const scanPaths = selectedFolders.map(f => ({
        path: f.path,
        platformId: f.platformId,
      }));

      const result = await scanLibrary(scanPaths);
      setScanResult(result);

      // Add paths to settings
      for (const folder of selectedFolders) {
        if (!settings.libraryPaths.includes(folder.path)) {
          settings.addLibraryPath(folder.path);
        }
      }

      // Clear selection after successful scan
      setSelectedFolders([]);

      // Reload library
      await loadLibrary();
    } catch (error) {
      setScanResult({
        gamesFound: 0,
        gamesAdded: 0,
        gamesUpdated: 0,
        errors: [String(error)],
      });
    } finally {
      setScanning(false);
    }
  };

  // Rescan all saved library paths
  const handleRescanAll = async () => {
    if (settings.libraryPaths.length === 0) return;

    setScanning(true);
    setScanResult(null);

    try {
      // Rescan with auto-detection (no platform override)
      const scanPaths = settings.libraryPaths.map(path => ({ path }));
      const result = await scanLibrary(scanPaths);
      setScanResult(result);
      await loadLibrary();
    } catch (error) {
      setScanResult({
        gamesFound: 0,
        gamesAdded: 0,
        gamesUpdated: 0,
        errors: [String(error)],
      });
    } finally {
      setScanning(false);
    }
  };

  // Remove a saved library path
  const handleRemoveLibraryPath = (path: string) => {
    settings.removeLibraryPath(path);
  };

  // Group platforms by manufacturer for the dropdown
  const groupedPlatforms = platforms.reduce((acc, platform) => {
    const group = platform.manufacturer || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(platform);
    return acc;
  }, {} as Record<string, typeof platforms>);

  return (
    <section>
      <h3 className="font-display text-sm text-neon-cyan uppercase tracking-wider mb-4">
        Game Library
      </h3>

      {/* Add Folders Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleAddFolder}
        className="w-full p-4 rounded-lg border-2 border-dashed border-glass-border
                   hover:border-neon-cyan/50 hover:bg-glass-white/30
                   transition-all flex items-center justify-center gap-3 mb-4"
      >
        <FolderPlusIcon />
        <span className="font-body text-sm text-gray-300">
          Add Game Folders
        </span>
      </motion.button>

      {/* Selected Folders (to be scanned) */}
      <AnimatePresence>
        {selectedFolders.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 space-y-2"
          >
            <p className="text-xs text-gray-500 font-body uppercase tracking-wider">
              Folders to Scan ({selectedFolders.length})
            </p>
            {selectedFolders.map((folder) => (
              <motion.div
                key={folder.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-2 bg-neon-cyan/10 rounded-lg border border-neon-cyan/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <FolderIcon className="text-neon-cyan flex-shrink-0" />
                  <span className="font-body text-xs text-gray-300 truncate flex-1">
                    {folder.path}
                  </span>
                  <button
                    onClick={() => handleRemoveSelectedFolder(folder.path)}
                    className="text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>
                {/* Platform Selection */}
                <div className="flex items-center gap-2">
                  <span className="font-body text-xs text-gray-500">Platform:</span>
                  <select
                    value={folder.platformId || ''}
                    onChange={(e) => handleSetFolderPlatform(folder.path, e.target.value || undefined)}
                    className="flex-1 bg-void-black/50 border border-glass-border rounded px-2 py-1
                             font-body text-xs text-gray-300 focus:border-neon-cyan outline-none"
                  >
                    <option value="">Auto-detect</option>
                    {Object.entries(groupedPlatforms).map(([manufacturer, plats]) => (
                      <optgroup key={manufacturer} label={manufacturer}>
                        {plats.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.displayName}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </motion.div>
            ))}

            {/* Scan Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleScan}
              disabled={scanning}
              className="w-full py-3 rounded-lg bg-neon-cyan text-void-black font-display font-bold
                       hover:bg-neon-cyan/90 transition-colors disabled:opacity-50 mt-3"
            >
              {scanning ? (
                <span className="flex items-center justify-center gap-2">
                  <LoadingSpinner />
                  Scanning...
                </span>
              ) : (
                `Scan ${selectedFolders.length} Folder${selectedFolders.length > 1 ? 's' : ''}`
              )}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan Result */}
      <AnimatePresence>
        {scanResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg border mb-4 ${
              scanResult.errors.length > 0
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-neon-cyan/10 border-neon-cyan/30'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {scanResult.errors.length > 0 ? (
                <WarningIcon className="text-red-400" />
              ) : (
                <CheckIcon className="text-neon-cyan" />
              )}
              <p className="font-display text-sm text-white">
                Scan Complete
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display text-lg text-neon-cyan">{scanResult.gamesFound}</p>
                <p className="font-body text-xs text-gray-500">Found</p>
              </div>
              <div>
                <p className="font-display text-lg text-green-400">{scanResult.gamesAdded}</p>
                <p className="font-body text-xs text-gray-500">Added</p>
              </div>
              <div>
                <p className="font-display text-lg text-yellow-400">{scanResult.gamesUpdated}</p>
                <p className="font-body text-xs text-gray-500">Existing</p>
              </div>
            </div>
            {scanResult.errors.length > 0 && (
              <p className="font-body text-xs text-red-400 mt-2">
                {scanResult.errors.length} error(s) occurred during scan
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Library Paths */}
      {settings.libraryPaths.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 font-body uppercase tracking-wider">
              Library Folders ({settings.libraryPaths.length})
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRescanAll}
              disabled={scanning}
              className="text-xs font-body text-neon-cyan hover:text-neon-cyan/80 disabled:opacity-50"
            >
              Rescan All
            </motion.button>
          </div>
          {settings.libraryPaths.map((path) => (
            <div
              key={path}
              className="flex items-center gap-2 p-2 bg-glass-white rounded-lg border border-glass-border"
            >
              <FolderIcon className="text-gray-500 flex-shrink-0" />
              <span className="font-body text-xs text-gray-400 truncate flex-1">
                {path}
              </span>
              <button
                onClick={() => handleRemoveLibraryPath(path)}
                className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                title="Remove from library"
              >
                <CloseIcon size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {settings.libraryPaths.length === 0 && selectedFolders.length === 0 && (
        <div className="text-center py-4">
          <p className="font-body text-xs text-gray-600">
            No library folders configured. Add folders containing your game files to get started.
          </p>
        </div>
      )}
    </section>
  );
}

interface ToggleSettingProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function ToggleSetting({ label, description, value, onChange }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-body text-sm text-white">{label}</p>
        <p className="font-body text-xs text-gray-500">{description}</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onChange(!value)}
        className={`
          relative w-12 h-6 rounded-full transition-colors
          ${value ? 'bg-neon-cyan' : 'bg-glass-white'}
        `}
      >
        <motion.div
          animate={{ x: value ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={`
            absolute top-1 w-4 h-4 rounded-full transition-colors
            ${value ? 'bg-void-black' : 'bg-gray-500'}
          `}
        />
      </motion.button>
    </div>
  );
}

interface ThemeOptionProps {
  name: string;
  value: string;
  selected: boolean;
  onClick: () => void;
  color: string;
}

function ThemeOption({ name, selected, onClick, color }: ThemeOptionProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        p-3 rounded-lg border transition-all
        ${selected
          ? 'border-neon-cyan bg-neon-cyan/10'
          : 'border-glass-border bg-glass-white hover:border-gray-600'
        }
      `}
    >
      <div
        className="w-full h-2 rounded mb-2"
        style={{ backgroundColor: color }}
      />
      <p className="font-body text-xs text-white">{name}</p>
    </motion.button>
  );
}

// Icons
function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function FolderPlusIcon() {
  return (
    <svg className="w-6 h-6 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    </svg>
  );
}

function FolderIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function CheckIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WarningIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
