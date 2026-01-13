import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { open, ask } from '@tauri-apps/plugin-dialog';
import { useUIStore, useSettingsStore, useLibraryStore } from '../../stores';
import {
  scanLibrary,
  addEmulator,
  updateEmulator,
  deleteEmulator,
  setDefaultEmulator,
  validateEmulatorPath,
  getDefaultRetroArchCoresPath,
  scanRetroArchCores,
  getSetting,
  setSetting,
} from '../../services/library';
import type { ScanResult, RetroArchCore } from '../../services/library';
import type { Emulator, Platform } from '../../types';

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

              {/* RetroArch Setup Section */}
              <RetroArchSetupSection />

              {/* Emulators Section */}
              <EmulatorManagementSection />

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

// ==================== RETROARCH SETUP ====================

// Core to platform mapping - maps known RetroArch core names to platform IDs
const coreToPlatformMap: Record<string, string[]> = {
  'snes9x': ['snes'],
  'bsnes': ['snes'],
  'mesen-s': ['snes'],
  'mesen': ['nes'],
  'nestopia': ['nes'],
  'fceumm': ['nes'],
  'quicknes': ['nes'],
  'mupen64plus': ['n64'],
  'parallel-n64': ['n64'],
  'mgba': ['gba', 'gbc', 'gb'],
  'vba-m': ['gba', 'gbc', 'gb'],
  'gambatte': ['gbc', 'gb'],
  'sameboy': ['gbc', 'gb'],
  'melonds': ['nds'],
  'desmume': ['nds'],
  'pcsx-rearmed': ['ps1'],
  'mednafen-psx': ['ps1'],
  'swanstation': ['ps1'],
  'genesis-plus-gx': ['genesis', 'sms', 'gamegear'],
  'picodrive': ['genesis', 'sms', '32x'],
  'blastem': ['genesis'],
  'flycast': ['dreamcast'],
  'redream': ['dreamcast'],
  'beetle-saturn': ['saturn'],
  'yabause': ['saturn'],
  'mednafen-pce': ['tg16'],
  'prosystem': ['atari7800'],
  'stella': ['atari2600'],
  'fbalpha': ['arcade'],
  'fbneo': ['arcade'],
  'mame': ['arcade'],
  'ppsspp': ['psp'],
  'dolphin': ['gamecube', 'wii'],
  'citra': ['3ds'],
};

interface CoreWithPlatforms extends RetroArchCore {
  suggestedPlatforms: string[];
  selectedPlatforms: string[];
  enabled: boolean;
}

function RetroArchSetupSection() {
  const [retroArchPath, setRetroArchPath] = useState('');
  const [coresPath, setCoresPath] = useState('');
  const [cores, setCores] = useState<CoreWithPlatforms[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { platforms, emulators, loadLibrary, addEmulator: addEmulatorToStore } = useLibraryStore();

  // Load saved RetroArch settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      const savedPath = await getSetting('retroarch_path');
      const savedCoresPath = await getSetting('retroarch_cores_path');
      if (savedPath) setRetroArchPath(savedPath);
      if (savedCoresPath) {
        setCoresPath(savedCoresPath);
      } else {
        // Try to auto-detect cores path
        const defaultPath = await getDefaultRetroArchCoresPath();
        if (defaultPath) setCoresPath(defaultPath);
      }
    };
    loadSettings();
  }, []);

  const handleBrowseRetroArch = async () => {
    try {
      const isMacOS = navigator.platform.toLowerCase().includes('mac') ||
                      navigator.userAgent.toLowerCase().includes('mac');

      const selected = await open({
        multiple: false,
        title: isMacOS ? 'Select RetroArch Application' : 'Select RetroArch Executable',
        directory: false,
        filters: isMacOS ? undefined : [
          { name: 'Executables', extensions: ['exe', ''] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (selected && typeof selected === 'string') {
        setRetroArchPath(selected);
        await setSetting('retroarch_path', selected);
      }
    } catch (error) {
      console.error('Failed to browse for RetroArch:', error);
    }
  };

  const handleBrowseCoresFolder = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: 'Select RetroArch Cores Folder',
        directory: true,
      });

      if (selected && typeof selected === 'string') {
        setCoresPath(selected);
        await setSetting('retroarch_cores_path', selected);
        // Auto-scan when folder is selected
        await handleScanCores(selected);
      }
    } catch (error) {
      console.error('Failed to browse for cores folder:', error);
    }
  };

  const handleScanCores = async (path?: string) => {
    const scanPath = path || coresPath;
    if (!scanPath) return;

    setScanning(true);
    try {
      const foundCores = await scanRetroArchCores(scanPath);

      // Map cores to platforms and check which are already configured as emulators
      const coresWithPlatforms: CoreWithPlatforms[] = foundCores.map(core => {
        // Find suggested platforms based on core name
        const coreName = core.displayName.toLowerCase().replace(/\s+/g, '-');
        let suggestedPlatforms: string[] = [];

        for (const [coreKey, platformIds] of Object.entries(coreToPlatformMap)) {
          if (coreName.includes(coreKey) || core.fileName.toLowerCase().includes(coreKey)) {
            suggestedPlatforms = platformIds;
            break;
          }
        }

        // Check if this core is already configured as an emulator
        const existingEmulator = emulators.find(e =>
          e.launchArguments.includes(core.fullPath) ||
          e.name.toLowerCase().includes(core.displayName.toLowerCase())
        );

        return {
          ...core,
          suggestedPlatforms,
          selectedPlatforms: existingEmulator
            ? existingEmulator.supportedPlatformIds
            : suggestedPlatforms,
          enabled: !!existingEmulator,
        };
      });

      setCores(coresWithPlatforms);
    } catch (error) {
      console.error('Failed to scan cores:', error);
    } finally {
      setScanning(false);
    }
  };

  const toggleCorePlatform = (coreIndex: number, platformId: string) => {
    setCores(prev => prev.map((core, i) => {
      if (i !== coreIndex) return core;

      const newPlatforms = core.selectedPlatforms.includes(platformId)
        ? core.selectedPlatforms.filter(p => p !== platformId)
        : [...core.selectedPlatforms, platformId];

      return { ...core, selectedPlatforms: newPlatforms };
    }));
  };

  const toggleCoreEnabled = (coreIndex: number) => {
    setCores(prev => prev.map((core, i) => {
      if (i !== coreIndex) return core;
      return { ...core, enabled: !core.enabled };
    }));
  };

  const handleSaveEnabledCores = async () => {
    if (!retroArchPath) {
      alert('Please set the RetroArch application path first');
      return;
    }

    setSaving(true);
    try {
      const enabledCores = cores.filter(c => c.enabled && c.selectedPlatforms.length > 0);

      for (const core of enabledCores) {
        // Check if emulator already exists for this core
        const existingEmulator = emulators.find(e =>
          e.launchArguments.includes(core.fullPath)
        );

        if (!existingEmulator) {
          // Create new emulator entry
          const newEmulator = await addEmulator({
            name: `RetroArch (${core.displayName})`,
            executablePath: retroArchPath,
            launchArguments: `-L "${core.fullPath}" "{rom}"`,
            supportedPlatformIds: core.selectedPlatforms,
          });
          addEmulatorToStore(newEmulator);
        }
      }

      await loadLibrary();
    } catch (error) {
      console.error('Failed to save cores:', error);
    } finally {
      setSaving(false);
    }
  };

  // Group platforms by manufacturer for display
  const groupedPlatforms = platforms.reduce((acc, platform) => {
    const group = platform.manufacturer || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(platform);
    return acc;
  }, {} as Record<string, Platform[]>);

  return (
    <section>
      <div
        className="flex items-center justify-between cursor-pointer mb-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-display text-sm text-neon-magenta uppercase tracking-wider flex items-center gap-2">
          <RetroArchIcon />
          RetroArch Setup
        </h3>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="text-gray-400"
        >
          <ChevronIcon />
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden space-y-4"
          >
            {/* RetroArch Path */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                RetroArch Application
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={retroArchPath}
                  onChange={(e) => setRetroArchPath(e.target.value)}
                  placeholder="Path to RetroArch..."
                  className="flex-1 px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                           text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-magenta"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBrowseRetroArch}
                  className="px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                           text-sm text-gray-300 hover:text-white hover:border-neon-magenta transition-colors"
                >
                  Browse
                </motion.button>
              </div>
            </div>

            {/* Cores Folder */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
                Cores Folder
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coresPath}
                  onChange={(e) => setCoresPath(e.target.value)}
                  placeholder="Path to cores folder..."
                  className="flex-1 px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                           text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-magenta"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBrowseCoresFolder}
                  className="px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                           text-sm text-gray-300 hover:text-white hover:border-neon-magenta transition-colors"
                >
                  Browse
                </motion.button>
              </div>
            </div>

            {/* Scan Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleScanCores()}
              disabled={!coresPath || scanning}
              className="w-full py-2 rounded-lg bg-neon-magenta/20 border border-neon-magenta/50
                       text-neon-magenta font-display text-sm hover:bg-neon-magenta/30 transition-colors
                       disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {scanning ? (
                <>
                  <SmallSpinner />
                  Scanning...
                </>
              ) : (
                <>
                  <ScanIcon />
                  Scan for Cores
                </>
              )}
            </motion.button>

            {/* Found Cores */}
            {cores.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 uppercase tracking-wider">
                    Found {cores.length} Cores
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveEnabledCores}
                    disabled={saving || !cores.some(c => c.enabled)}
                    className="px-3 py-1 rounded bg-neon-magenta text-void-black font-display text-xs font-bold
                             hover:bg-neon-magenta/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Enabled Cores'}
                  </motion.button>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                  {cores.map((core, index) => (
                    <div
                      key={core.fileName}
                      className={`p-3 rounded-lg border transition-colors ${
                        core.enabled
                          ? 'bg-neon-magenta/10 border-neon-magenta/50'
                          : 'bg-glass-white border-glass-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={core.enabled}
                            onChange={() => toggleCoreEnabled(index)}
                            className="w-4 h-4 rounded border-glass-border bg-glass-white
                                     text-neon-magenta focus:ring-neon-magenta focus:ring-offset-0"
                          />
                          <span className="font-body text-sm text-white">{core.displayName}</span>
                        </label>
                      </div>

                      {/* Platform Selection */}
                      {core.enabled && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(groupedPlatforms).flatMap(([_, platformList]) =>
                            platformList.map(platform => {
                              const isSelected = core.selectedPlatforms.includes(platform.id);
                              const isSuggested = core.suggestedPlatforms.includes(platform.id);

                              return (
                                <button
                                  key={platform.id}
                                  onClick={() => toggleCorePlatform(index, platform.id)}
                                  className={`px-2 py-0.5 rounded text-xs font-body transition-colors ${
                                    isSelected
                                      ? 'bg-neon-magenta/30 text-neon-magenta border border-neon-magenta/50'
                                      : isSuggested
                                      ? 'bg-glass-white text-gray-300 border border-dashed border-neon-magenta/30'
                                      : 'bg-glass-white text-gray-500 border border-transparent hover:border-glass-border'
                                  }`}
                                >
                                  {platform.displayName}
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cores.length === 0 && coresPath && !scanning && (
              <p className="text-xs text-gray-500 text-center py-4">
                No cores found. Click "Scan for Cores" to search.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function RetroArchIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v6.36l-7-3.5V8.82zm9 9.86v-6.36l7-3.5v6.36l-7 3.5z"/>
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function SmallSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// ==================== EMULATOR MANAGEMENT ====================

interface EmulatorFormData {
  name: string;
  executablePath: string;
  launchArguments: string;
  supportedPlatformIds: string[];
}

const defaultEmulatorForm: EmulatorFormData = {
  name: '',
  executablePath: '',
  launchArguments: '{rom}',
  supportedPlatformIds: [],
};

function EmulatorManagementSection() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmulator, setEditingEmulator] = useState<Emulator | null>(null);
  const [formData, setFormData] = useState<EmulatorFormData>(defaultEmulatorForm);
  const [isValidPath, setIsValidPath] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const { emulators, platforms, loadLibrary, addEmulator: addEmulatorToStore, updateEmulator: updateEmulatorInStore, deleteEmulator: deleteEmulatorFromStore } = useLibraryStore();

  // Group platforms by manufacturer
  const groupedPlatforms = platforms.reduce((acc, platform) => {
    const group = platform.manufacturer || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(platform);
    return acc;
  }, {} as Record<string, Platform[]>);

  const handleBrowseExecutable = async () => {
    try {
      // Detect if we're on macOS to handle .app bundles
      const isMacOS = navigator.platform.toLowerCase().includes('mac') ||
                      navigator.userAgent.toLowerCase().includes('mac');

      // On macOS, use file picker without filters - this allows selecting .app bundles
      // which appear as files in the picker even though they're technically directories
      // On Windows/Linux, use filters for executables
      const selected = await open({
        multiple: false,
        title: isMacOS ? 'Select Emulator Application' : 'Select Emulator Executable',
        directory: false,
        filters: isMacOS
          ? undefined // No filters on macOS - allows .app bundles to be selected
          : [
              { name: 'Executables', extensions: ['exe', 'sh', ''] },
              { name: 'All Files', extensions: ['*'] },
            ],
      });

      if (selected && typeof selected === 'string') {
        setFormData({ ...formData, executablePath: selected });
        const valid = await validateEmulatorPath(selected);
        setIsValidPath(valid);
      }
    } catch (error) {
      console.error('Failed to browse for executable:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.executablePath) return;

    setSaving(true);
    try {
      if (editingEmulator) {
        // Update existing emulator
        await updateEmulator(editingEmulator.id, {
          name: formData.name,
          executablePath: formData.executablePath,
          launchArguments: formData.launchArguments,
          supportedPlatformIds: formData.supportedPlatformIds,
        });
        updateEmulatorInStore(editingEmulator.id, formData);
      } else {
        // Add new emulator
        const newEmulator = await addEmulator({
          name: formData.name,
          executablePath: formData.executablePath,
          launchArguments: formData.launchArguments,
          supportedPlatformIds: formData.supportedPlatformIds,
        });
        addEmulatorToStore(newEmulator);
      }

      // Reset form
      setFormData(defaultEmulatorForm);
      setEditingEmulator(null);
      setShowAddForm(false);
      setIsValidPath(null);
    } catch (error) {
      console.error('Failed to save emulator:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (emulator: Emulator) => {
    setEditingEmulator(emulator);
    setFormData({
      name: emulator.name,
      executablePath: emulator.executablePath,
      launchArguments: emulator.launchArguments,
      supportedPlatformIds: emulator.supportedPlatformIds,
    });
    setShowAddForm(true);
    setIsValidPath(true); // Assume valid since it was saved before
  };

  const handleDelete = async (emulator: Emulator) => {
    const confirmed = await ask(`Are you sure you want to delete "${emulator.name}"?`, {
      title: 'Delete Emulator',
      kind: 'warning',
    });

    if (confirmed) {
      await deleteEmulator(emulator.id);
      deleteEmulatorFromStore(emulator.id);
    }
  };

  const handleSetDefault = async (platformId: string, emulatorId: string) => {
    try {
      await setDefaultEmulator(platformId, emulatorId);
      // Reload to get updated platform data
      await loadLibrary();
    } catch (error) {
      console.error('Failed to set default emulator:', error);
    }
  };

  const handleCancel = () => {
    setFormData(defaultEmulatorForm);
    setEditingEmulator(null);
    setShowAddForm(false);
    setIsValidPath(null);
  };

  const togglePlatform = (platformId: string) => {
    const current = formData.supportedPlatformIds;
    if (current.includes(platformId)) {
      setFormData({
        ...formData,
        supportedPlatformIds: current.filter(id => id !== platformId),
      });
    } else {
      setFormData({
        ...formData,
        supportedPlatformIds: [...current, platformId],
      });
    }
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm text-neon-cyan uppercase tracking-wider">
          Emulators
        </h3>
        {!showAddForm && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddForm(true)}
            className="text-xs font-body text-neon-cyan hover:text-neon-cyan/80 flex items-center gap-1"
          >
            <PlusIcon />
            Add Emulator
          </motion.button>
        )}
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-4 bg-glass-white rounded-lg border border-glass-border space-y-4"
          >
            <h4 className="font-display text-sm text-white">
              {editingEmulator ? 'Edit Emulator' : 'Add New Emulator'}
            </h4>

            {/* Name */}
            <div>
              <label className="block font-body text-xs text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., PCSX2, Dolphin, RetroArch"
                className="w-full bg-void-black/50 border border-glass-border rounded-lg px-3 py-2
                         font-body text-sm text-white placeholder-gray-600
                         focus:border-neon-cyan focus:outline-none"
              />
            </div>

            {/* Executable Path */}
            <div>
              <label className="block font-body text-xs text-gray-400 mb-1">Executable Path</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.executablePath}
                  onChange={(e) => {
                    setFormData({ ...formData, executablePath: e.target.value });
                    setIsValidPath(null);
                  }}
                  placeholder="/path/to/emulator"
                  className={`flex-1 bg-void-black/50 border rounded-lg px-3 py-2
                           font-body text-sm text-white placeholder-gray-600
                           focus:outline-none ${
                             isValidPath === true
                               ? 'border-green-500'
                               : isValidPath === false
                               ? 'border-red-500'
                               : 'border-glass-border focus:border-neon-cyan'
                           }`}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleBrowseExecutable}
                  className="px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                           font-body text-sm text-gray-300 hover:text-white hover:border-gray-500"
                >
                  Browse
                </motion.button>
              </div>
              {isValidPath === false && (
                <p className="mt-1 text-xs text-red-400 font-body">
                  Executable not found at this path
                </p>
              )}
            </div>

            {/* Launch Arguments */}
            <div>
              <label className="block font-body text-xs text-gray-400 mb-1">
                Launch Arguments
                <span className="text-gray-600 ml-1">(use {'{rom}'} for game path)</span>
              </label>
              <input
                type="text"
                value={formData.launchArguments}
                onChange={(e) => setFormData({ ...formData, launchArguments: e.target.value })}
                placeholder="{rom}"
                className="w-full bg-void-black/50 border border-glass-border rounded-lg px-3 py-2
                         font-body text-sm text-white placeholder-gray-600
                         focus:border-neon-cyan focus:outline-none"
              />
              <p className="mt-1 text-xs text-gray-600 font-body">
                Example: --fullscreen {'{rom}'} or -L /path/to/core.so {'{rom}'}
              </p>
            </div>

            {/* Supported Platforms */}
            <div>
              <label className="block font-body text-xs text-gray-400 mb-2">Supported Platforms</label>
              <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-void-black/30 rounded-lg">
                {Object.entries(groupedPlatforms).map(([manufacturer, plats]) => (
                  <div key={manufacturer}>
                    <p className="text-xs text-gray-600 font-body mb-1">{manufacturer}</p>
                    <div className="flex flex-wrap gap-1">
                      {plats.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => togglePlatform(p.id)}
                          className={`px-2 py-1 rounded text-xs font-body transition-colors ${
                            formData.supportedPlatformIds.includes(p.id)
                              ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                              : 'bg-glass-white text-gray-400 border border-transparent hover:border-glass-border'
                          }`}
                        >
                          {p.displayName}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-2 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving || !formData.name || !formData.executablePath}
                className="flex-1 py-2 rounded-lg bg-neon-cyan text-void-black font-display font-bold
                         hover:bg-neon-cyan/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingEmulator ? 'Update Emulator' : 'Add Emulator'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-glass-white text-gray-300 font-body
                         hover:text-white hover:bg-glass-border transition-colors"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Emulator List */}
      {emulators.length > 0 ? (
        <div className="space-y-2">
          {emulators.map((emulator) => (
            <EmulatorCard
              key={emulator.id}
              emulator={emulator}
              platforms={platforms}
              onEdit={() => handleEdit(emulator)}
              onDelete={() => handleDelete(emulator)}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      ) : !showAddForm ? (
        <div className="text-center py-6">
          <GamepadIcon className="w-12 h-12 text-gray-700 mx-auto mb-3" />
          <p className="font-body text-sm text-gray-500 mb-2">No emulators configured</p>
          <p className="font-body text-xs text-gray-600">
            Add emulators to launch your games
          </p>
        </div>
      ) : null}
    </section>
  );
}

interface EmulatorCardProps {
  emulator: Emulator;
  platforms: Platform[];
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: (platformId: string, emulatorId: string) => void;
}

function EmulatorCard({ emulator, platforms, onEdit, onDelete, onSetDefault }: EmulatorCardProps) {
  const [expanded, setExpanded] = useState(false);

  const supportedPlatforms = platforms.filter(p =>
    emulator.supportedPlatformIds.includes(p.id)
  );

  const platformsWithDefault = platforms.filter(p =>
    p.defaultEmulatorId === emulator.id
  );

  return (
    <motion.div
      layout
      className="bg-glass-white rounded-lg border border-glass-border overflow-hidden"
    >
      {/* Header */}
      <div
        className="p-3 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <GamepadIcon className="w-5 h-5 text-neon-cyan flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm text-white truncate">{emulator.name}</p>
          <p className="font-body text-xs text-gray-500 truncate">
            {supportedPlatforms.length} platform{supportedPlatforms.length !== 1 ? 's' : ''}
            {platformsWithDefault.length > 0 && (
              <span className="text-neon-cyan ml-2">
                • Default for {platformsWithDefault.length}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded hover:bg-glass-border text-gray-500 hover:text-white transition-colors"
          >
            <EditIcon />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded hover:bg-glass-border text-gray-500 hover:text-red-400 transition-colors"
          >
            <TrashIcon />
          </motion.button>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            className="text-gray-500"
          >
            <ChevronIcon />
          </motion.div>
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-glass-border"
          >
            <div className="p-3 space-y-3">
              {/* Path */}
              <div>
                <p className="font-body text-xs text-gray-500 mb-1">Executable</p>
                <p className="font-body text-xs text-gray-400 truncate">{emulator.executablePath}</p>
              </div>

              {/* Arguments */}
              <div>
                <p className="font-body text-xs text-gray-500 mb-1">Launch Arguments</p>
                <p className="font-body text-xs text-gray-400 font-mono">{emulator.launchArguments}</p>
              </div>

              {/* Set as Default */}
              {supportedPlatforms.length > 0 && (
                <div>
                  <p className="font-body text-xs text-gray-500 mb-2">Set as Default For</p>
                  <div className="flex flex-wrap gap-1">
                    {supportedPlatforms.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => onSetDefault(p.id, emulator.id)}
                        className={`px-2 py-1 rounded text-xs font-body transition-colors ${
                          p.defaultEmulatorId === emulator.id
                            ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/50'
                            : 'bg-void-black/50 text-gray-400 border border-glass-border hover:border-neon-cyan/30 hover:text-gray-300'
                        }`}
                      >
                        {p.displayName}
                        {p.defaultEmulatorId === emulator.id && ' ✓'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Additional Icons
function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function GamepadIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
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
