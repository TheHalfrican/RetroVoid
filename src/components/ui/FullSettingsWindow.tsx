import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { open, ask } from '@tauri-apps/plugin-dialog';
import { useUIStore, useSettingsStore, useLibraryStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';
import {
  scanLibrary,
  addEmulator,
  updateEmulator,
  deleteEmulator,
  setDefaultEmulator,
  getDefaultRetroArchCoresPath,
  scanRetroArchCores,
  getSetting,
  setSetting,
  addGame,
  type CreateGameInput,
} from '../../services/library';
import { validateEmulatorPath } from '../../services/emulator';
import { validateIgdbCredentials } from '../../services/scraper';
import type { ScanResult, RetroArchCore, ScanPath } from '../../services/library';
import type { Emulator, Platform, Quality3D } from '../../types';

type SettingsTab = 'library' | 'manual-import' | 'scummvm-import' | 'emulators' | 'retroarch' | 'platforms' | 'metadata' | 'appearance';

const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
  { id: 'library', label: 'Library', icon: <FolderIcon /> },
  { id: 'manual-import', label: 'Manual Import', icon: <ManualImportIcon /> },
  { id: 'scummvm-import', label: 'ScummVM Import', icon: <ScummVMIcon /> },
  { id: 'platforms', label: 'Platform Defaults', icon: <PlatformIcon /> },
  { id: 'emulators', label: 'Emulators', icon: <GamepadIcon /> },
  { id: 'retroarch', label: 'RetroArch', icon: <RetroArchIcon /> },
  { id: 'metadata', label: 'Metadata', icon: <MetadataIcon /> },
  { id: 'appearance', label: 'Appearance', icon: <PaletteIcon /> },
];

export function FullSettingsWindow() {
  const { fullSettingsOpen, closeFullSettings, settingsTab, setSettingsTab } = useUIStore();
  const theme = useTheme();

  return (
    <AnimatePresence>
      {fullSettingsOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeFullSettings}
            className="fixed inset-0 backdrop-blur-sm z-50"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          />

          {/* Window */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-8 z-50 rounded-xl shadow-2xl overflow-hidden flex"
            style={{
              backgroundColor: 'var(--theme-bg-secondary)',
              border: '1px solid var(--theme-border)',
            }}
          >
            {/* Sidebar */}
            <div
              className="w-56 flex flex-col"
              style={{
                backgroundColor: 'var(--theme-bg)',
                borderRight: '1px solid var(--theme-border)',
              }}
            >
              <div className="p-4" style={{ borderBottom: '1px solid var(--theme-border)' }}>
                <h2 className="font-display text-lg font-bold" style={{ color: 'var(--theme-text)' }}>Settings</h2>
              </div>
              <nav className="flex-1 p-2 space-y-1">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setSettingsTab(tab.id)}
                    className="w-full px-3 py-2 rounded-lg flex items-center gap-3 text-left transition-colors"
                    style={{
                      backgroundColor: settingsTab === tab.id ? theme.accentMuted : 'transparent',
                      color: settingsTab === tab.id ? theme.accent : 'var(--theme-text-secondary)',
                    }}
                    onMouseEnter={(e) => {
                      if (settingsTab !== tab.id) {
                        e.currentTarget.style.backgroundColor = 'var(--theme-surface)';
                        e.currentTarget.style.color = 'var(--theme-text)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (settingsTab !== tab.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = 'var(--theme-text-secondary)';
                      }
                    }}
                  >
                    {tab.icon}
                    <span className="font-body text-sm">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Header */}
              <div
                className="p-6 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--theme-border)' }}
              >
                <h3 className="font-display text-xl font-bold" style={{ color: 'var(--theme-text)' }}>
                  {tabs.find(t => t.id === settingsTab)?.label}
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={closeFullSettings}
                  className="p-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    color: 'var(--theme-text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-surface-hover)';
                    e.currentTarget.style.color = 'var(--theme-text)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--theme-surface)';
                    e.currentTarget.style.color = 'var(--theme-text-muted)';
                  }}
                >
                  <CloseIcon />
                </motion.button>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {settingsTab === 'library' && <LibraryTab />}
                {settingsTab === 'manual-import' && <ManualImportTab />}
                {settingsTab === 'scummvm-import' && <ScummVMImportTab />}
                {settingsTab === 'platforms' && <PlatformDefaultsTab />}
                {settingsTab === 'emulators' && <EmulatorsTab />}
                {settingsTab === 'retroarch' && <RetroArchTab />}
                {settingsTab === 'metadata' && <MetadataTab />}
                {settingsTab === 'appearance' && <AppearanceTab />}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ==================== LIBRARY TAB ====================

function LibraryTab() {
  const [folders, setFolders] = useState<ScanPath[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanningFolderIndex, setScanningFolderIndex] = useState<number | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const { platforms, loadLibrary } = useLibraryStore();

  useEffect(() => {
    const loadFolders = async () => {
      const savedFolders = await getSetting('library_folders');
      if (savedFolders) {
        try {
          setFolders(JSON.parse(savedFolders));
        } catch (e) {
          console.error('Failed to parse saved folders:', e);
        }
      }
    };
    loadFolders();
  }, []);

  const handleAddFolder = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: true,
        title: 'Select Games Folder',
      });

      if (selected && typeof selected === 'string') {
        const newFolders = [...folders, { path: selected }];
        setFolders(newFolders);
        await setSetting('library_folders', JSON.stringify(newFolders));
      }
    } catch (error) {
      console.error('Failed to add folder:', error);
    }
  };

  const handleRemoveFolder = async (index: number) => {
    const newFolders = folders.filter((_, i) => i !== index);
    setFolders(newFolders);
    await setSetting('library_folders', JSON.stringify(newFolders));
  };

  const handleSetFolderPlatform = async (index: number, platformId: string | undefined) => {
    const newFolders = folders.map((f, i) =>
      i === index ? { ...f, platformId } : f
    );
    setFolders(newFolders);
    await setSetting('library_folders', JSON.stringify(newFolders));
  };

  const handleScan = async () => {
    if (folders.length === 0) return;

    setScanning(true);
    setScanResult(null);
    try {
      const result = await scanLibrary(folders);
      setScanResult(result);
      await loadLibrary();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  const handleScanFolder = async (index: number) => {
    const folder = folders[index];
    if (!folder) return;

    setScanningFolderIndex(index);
    setScanResult(null);
    try {
      const result = await scanLibrary([folder]);
      setScanResult(result);
      await loadLibrary();
    } catch (error) {
      console.error('Scan failed:', error);
    } finally {
      setScanningFolderIndex(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-display text-sm text-white mb-1">Game Folders</h4>
            <p className="text-xs text-gray-500">Add folders containing your game files</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleAddFolder}
            className="px-4 py-2 rounded-lg bg-neon-cyan text-void-black font-display text-sm font-bold
                     hover:bg-neon-cyan/90 transition-colors flex items-center gap-2"
          >
            <PlusIcon />
            Add Folder
          </motion.button>
        </div>

        {folders.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-glass-border rounded-lg text-center">
            <p className="text-gray-500 text-sm">No folders added yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {folders.map((folder, index) => (
              <div
                key={index}
                className="p-4 bg-glass-white border border-glass-border rounded-lg flex items-center gap-4"
              >
                <FolderIcon className="w-5 h-5 text-neon-cyan flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-white truncate">{folder.path}</p>
                </div>
                <select
                  value={folder.platformId || ''}
                  onChange={(e) => handleSetFolderPlatform(index, e.target.value || undefined)}
                  className="px-2 py-1 bg-glass-white border border-glass-border rounded text-xs text-gray-300
                           focus:outline-none focus:border-neon-cyan"
                >
                  <option value="">Auto-detect platform</option>
                  {platforms.map(p => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleScanFolder(index)}
                  disabled={scanning || scanningFolderIndex !== null}
                  className="px-2 py-1 rounded bg-glass-white border border-glass-border text-xs text-gray-300
                           hover:text-neon-cyan hover:border-neon-cyan transition-colors
                           disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {scanningFolderIndex === index ? (
                    <LoadingSpinner />
                  ) : (
                    <ScanIcon />
                  )}
                  <span className="hidden sm:inline">Scan</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleRemoveFolder(index)}
                  className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <TrashIcon />
                </motion.button>
              </div>
            ))}
          </div>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleScan}
        disabled={scanning || folders.length === 0}
        className="w-full py-3 rounded-lg bg-neon-cyan text-void-black font-display font-bold
                 hover:bg-neon-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-center gap-2"
      >
        {scanning ? (
          <>
            <LoadingSpinner />
            Scanning...
          </>
        ) : (
          <>
            <ScanIcon />
            Scan Library
          </>
        )}
      </motion.button>

      {scanResult && (
        <div className="p-4 bg-glass-white border border-glass-border rounded-lg">
          <h4 className="font-display text-sm text-white mb-2">Scan Results</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-display text-2xl text-neon-cyan">{scanResult.gamesFound}</p>
              <p className="text-xs text-gray-500">Found</p>
            </div>
            <div>
              <p className="font-display text-2xl text-green-400">{scanResult.gamesAdded}</p>
              <p className="text-xs text-gray-500">Added</p>
            </div>
            <div>
              <p className="font-display text-2xl text-yellow-400">{scanResult.gamesUpdated}</p>
              <p className="text-xs text-gray-500">Updated</p>
            </div>
          </div>
          {scanResult.errors.length > 0 && (
            <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300">
              {scanResult.errors.length} error(s) occurred
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== MANUAL IMPORT TAB ====================

function ManualImportTab() {
  const { platforms, loadLibrary } = useLibraryStore();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string>('');
  const [gameTitle, setGameTitle] = useState<string>('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Get file extension from path
  const getFileExtension = (path: string): string => {
    const parts = path.split('.');
    return parts.length > 1 ? `.${parts.pop()?.toLowerCase()}` : '';
  };

  // Get file name from path (without extension, for game title)
  const getFileName = (path: string): string => {
    const name = path.split(/[/\\]/).pop() || 'Unknown';
    const dotIndex = name.lastIndexOf('.');
    return dotIndex > 0 ? name.substring(0, dotIndex) : name;
  };

  // Check if file extension is valid for selected platform
  const isExtensionValid = (): boolean => {
    if (!selectedFile || !selectedPlatformId) return false;
    const platform = platforms.find(p => p.id === selectedPlatformId);
    if (!platform) return false;
    // If platform has no extensions (like PS3), allow any file
    if (platform.fileExtensions.length === 0) return true;
    const ext = getFileExtension(selectedFile);
    return platform.fileExtensions.some(e => e.toLowerCase() === ext);
  };

  // Get valid extensions for display
  const getValidExtensions = (): string[] => {
    const platform = platforms.find(p => p.id === selectedPlatformId);
    return platform?.fileExtensions || [];
  };

  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        title: 'Select Game File',
      });

      if (selected && typeof selected === 'string') {
        setSelectedFile(selected);
        setGameTitle(getFileName(selected));
        setResult(null);
      }
    } catch (error) {
      console.error('Failed to select file:', error);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !selectedPlatformId || !gameTitle.trim()) return;

    setImporting(true);
    setResult(null);

    try {
      const title = gameTitle.trim();
      const input: CreateGameInput = {
        title,
        romPath: selectedFile,
        platformId: selectedPlatformId,
      };

      await addGame(input);
      await loadLibrary();

      setResult({ success: true, message: `Successfully added "${title}" to your library!` });
      setSelectedFile(null);
      setSelectedPlatformId('');
      setGameTitle('');
    } catch (error) {
      setResult({ success: false, message: `Failed to add game: ${String(error)}` });
    } finally {
      setImporting(false);
    }
  };

  // Group platforms by manufacturer for the dropdown
  const groupedPlatforms = platforms.reduce((acc, platform) => {
    const group = platform.manufacturer || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(platform);
    return acc;
  }, {} as Record<string, Platform[]>);

  const selectedPlatform = platforms.find(p => p.id === selectedPlatformId);
  const extensionValid = isExtensionValid();
  const validExtensions = getValidExtensions();

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
        <h4 className="font-display text-sm text-neon-cyan mb-2">When to use Manual Import</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          Some games cannot be detected during automatic library scans. This includes PlayStation 3 PKG files
          and Nintendo Switch NSP/XCI files, which can be DLC, updates, or actual games - making automatic
          detection unreliable. You can also use this to add modern Windows executables (.exe) for indie games
          and other PC titles. Use this page to manually add such games to your library.
        </p>
      </div>

      {/* PS3 PKG Workflow */}
      <div className="p-4 rounded-lg bg-deep-purple/50 border border-glass-border">
        <h5 className="font-display text-sm text-white mb-2">Adding PS3 PKG Games</h5>
        <p className="text-xs text-gray-400 mb-2">
          PKG files must be installed into RPCS3 first. After installation:
        </p>
        <ol className="text-xs text-gray-400 list-decimal list-inside space-y-1">
          <li>Open RPCS3 and right-click on the installed game</li>
          <li>Navigate to "Open Folder" and select "Open HDD Game Folder"</li>
          <li>Navigate to <span className="font-mono text-neon-cyan">USRDIR/EBOOT.BIN</span></li>
          <li>Use that EBOOT.BIN file path in Manual Import below</li>
        </ol>
      </div>

      {/* Switch Games Note */}
      <div className="p-4 rounded-lg bg-deep-purple/50 border border-glass-border">
        <h5 className="font-display text-sm text-white mb-2">Adding Switch Games</h5>
        <p className="text-xs text-gray-400">
          Unlike PS3 PKGs, Switch games launch directly from the <span className="font-mono text-neon-cyan">.nsp</span> or <span className="font-mono text-neon-cyan">.xci</span> file -
          no installation required. Simply select your game file below. Make sure to select the actual game file,
          not DLC or update files which use the same extensions.
        </p>
      </div>

      {/* Wii U Games Note */}
      <div className="p-4 rounded-lg bg-deep-purple/50 border border-glass-border">
        <h5 className="font-display text-sm text-white mb-2">Adding Wii U Games</h5>
        <p className="text-xs text-gray-400 mb-2">
          <span className="text-white">Direct ROM files</span> (<span className="font-mono text-neon-cyan">.wux</span>, <span className="font-mono text-neon-cyan">.wud</span>, <span className="font-mono text-neon-cyan">.wua</span>):
          Auto-detected during library scans.
        </p>
        <p className="text-xs text-gray-400 mb-2">
          <span className="text-white">Loadiine format games</span> (folder-based with <span className="font-mono text-neon-cyan">code/</span>, <span className="font-mono text-neon-cyan">content/</span>, <span className="font-mono text-neon-cyan">meta/</span> subfolders):
          Also auto-detected if the parent folder is in your scan paths.
        </p>
        <p className="text-xs text-gray-400 mb-2">
          <span className="text-white">Games installed in CEMU</span>: For games manually installed to CEMU:
        </p>
        <ol className="text-xs text-gray-400 list-decimal list-inside space-y-1">
          <li>Open CEMU and right-click on the installed game</li>
          <li>Select "Game Directory"</li>
          <li>Navigate into the <span className="font-mono text-neon-cyan">code</span> folder</li>
          <li>Select the <span className="font-mono text-neon-cyan">.rpx</span> file and use it in Manual Import below</li>
        </ol>
      </div>

      {/* Step 1: Select Platform */}
      <div>
        <h4 className="font-display text-sm text-white mb-2">1. Select Platform</h4>
        <select
          value={selectedPlatformId}
          onChange={(e) => {
            setSelectedPlatformId(e.target.value);
            setResult(null);
          }}
          className="w-full px-4 py-3 rounded-lg bg-void-black border border-glass-border text-white
                   font-body text-sm focus:outline-none focus:border-neon-cyan transition-colors"
        >
          <option value="">Choose a platform...</option>
          {Object.entries(groupedPlatforms).sort().map(([manufacturer, plats]) => (
            <optgroup key={manufacturer} label={manufacturer}>
              {plats.sort((a, b) => a.displayName.localeCompare(b.displayName)).map(platform => (
                <option key={platform.id} value={platform.id}>
                  {platform.displayName}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {selectedPlatform && validExtensions.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">
            Accepted file types: {validExtensions.join(', ')}
          </p>
        )}
        {selectedPlatform && validExtensions.length === 0 && (
          <p className="mt-2 text-xs text-gray-500">
            This platform accepts any file type (manual import only)
          </p>
        )}
      </div>

      {/* Step 2: Select File */}
      <div>
        <h4 className="font-display text-sm text-white mb-2">2. Select Game File</h4>
        <div className="flex gap-3">
          <div className="flex-1 px-4 py-3 rounded-lg bg-void-black border border-glass-border">
            <p className={`font-body text-sm truncate ${selectedFile ? 'text-white' : 'text-gray-500'}`}>
              {selectedFile || 'No file selected'}
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSelectFile}
            disabled={!selectedPlatformId}
            className="px-4 py-2 rounded-lg bg-glass-white text-white font-display text-sm
                     hover:bg-glass-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
          >
            <FolderIcon />
            Browse
          </motion.button>
        </div>
        {selectedFile && selectedPlatformId && !extensionValid && (
          <p className="mt-2 text-xs text-red-400">
            File type not accepted for {selectedPlatform?.displayName}.
            Expected: {validExtensions.join(', ')}
          </p>
        )}
      </div>

      {/* Step 3: Game Title */}
      <div>
        <h4 className="font-display text-sm text-white mb-2">3. Game Title</h4>
        <input
          type="text"
          value={gameTitle}
          onChange={(e) => setGameTitle(e.target.value)}
          placeholder="Enter game title..."
          disabled={!selectedFile}
          className="w-full px-4 py-3 rounded-lg bg-void-black border border-glass-border text-white
                   font-body text-sm focus:outline-none focus:border-neon-cyan transition-colors
                   placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <p className="mt-2 text-xs text-gray-500">
          Auto-filled from filename. Edit if needed.
        </p>
      </div>

      {/* Step 4: Import */}
      <div>
        <h4 className="font-display text-sm text-white mb-2">4. Add to Library</h4>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleImport}
          disabled={!selectedFile || !selectedPlatformId || !extensionValid || !gameTitle.trim() || importing}
          className="px-6 py-3 rounded-lg bg-neon-cyan text-void-black font-display text-sm font-bold
                   hover:bg-neon-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center gap-2"
        >
          {importing ? (
            <>
              <LoadingSpinner />
              Importing...
            </>
          ) : (
            <>
              <PlusIcon />
              Add Game
            </>
          )}
        </motion.button>
      </div>

      {/* Result Message */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            result.success
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <p className="font-body text-sm">{result.message}</p>
        </motion.div>
      )}
    </div>
  );
}

// ==================== SCUMMVM IMPORT TAB ====================

function ScummVMImportTab() {
  const [gameId, setGameId] = useState('');
  const [gameTitle, setGameTitle] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const { loadLibrary } = useLibraryStore();

  const handleImport = async () => {
    if (!gameId.trim() || !gameTitle.trim()) {
      setResult({ success: false, message: 'Please enter both a Game ID and Game Title' });
      return;
    }

    setImporting(true);
    setResult(null);

    try {
      const gameData: CreateGameInput = {
        title: gameTitle.trim(),
        romPath: gameId.trim(), // Store Game ID as the "rom path"
        platformId: 'scummvm',
      };

      await addGame(gameData);
      await loadLibrary();
      setResult({ success: true, message: `Successfully added "${gameTitle}" to your library!` });
      setGameId('');
      setGameTitle('');
    } catch (error) {
      setResult({ success: false, message: `Failed to add game: ${String(error)}` });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
        <h4 className="font-display text-sm text-neon-cyan mb-2">How ScummVM Works</h4>
        <p className="text-xs text-gray-400 leading-relaxed">
          ScummVM is a program that allows you to run classic graphical adventure games. Unlike traditional emulators,
          ScummVM uses <span className="text-neon-cyan font-semibold">Game IDs</span> to launch games instead of file paths.
          Each game has a unique ID (like <span className="font-mono text-neon-cyan">monkey</span> for Monkey Island or{' '}
          <span className="font-mono text-neon-cyan">tentacle</span> for Day of the Tentacle).
        </p>
      </div>

      {/* Finding Game IDs */}
      <div className="p-4 rounded-lg bg-deep-purple/50 border border-glass-border">
        <h5 className="font-display text-sm text-white mb-3">How to Find Your Game ID</h5>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-neon-magenta font-semibold mb-1">Option 1: From ScummVM's GUI (Easiest)</p>
            <ol className="text-xs text-gray-400 list-decimal list-inside space-y-1 ml-2">
              <li>Open ScummVM and add your game if you haven't already</li>
              <li>Right-click the game and select "Edit Game..."</li>
              <li>The Game ID is shown at the top of the dialog</li>
            </ol>
          </div>
          <div>
            <p className="text-xs text-neon-magenta font-semibold mb-1">Option 2: Command Line</p>
            <p className="text-xs text-gray-400 ml-2">
              Run: <span className="font-mono text-neon-cyan">scummvm --detect "/path/to/game/folder"</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-neon-magenta font-semibold mb-1">Option 3: ScummVM Compatibility List</p>
            <p className="text-xs text-gray-400 ml-2">
              Visit <span className="font-mono text-neon-cyan">scummvm.org/compatibility</span> to see all supported games and their IDs
            </p>
          </div>
        </div>
      </div>

      {/* Important Note */}
      <div className="p-4 rounded-lg bg-neon-orange/10 border border-neon-orange/30">
        <h5 className="font-display text-sm text-neon-orange mb-2">Important</h5>
        <p className="text-xs text-gray-400">
          Make sure you've already added the game to ScummVM before adding it here. RetroVoid will launch games
          using the command <span className="font-mono text-neon-cyan">scummvm [game-id]</span>, which requires
          the game to be registered in ScummVM first.
        </p>
      </div>

      {/* Game ID Input */}
      <div>
        <h4 className="font-display text-sm text-white mb-2">1. Enter ScummVM Game ID</h4>
        <input
          type="text"
          value={gameId}
          onChange={(e) => {
            setGameId(e.target.value.toLowerCase().replace(/\s/g, ''));
            setResult(null);
          }}
          placeholder="e.g., monkey, tentacle, sam, dott"
          className="w-full px-4 py-3 rounded-lg bg-void-black border border-glass-border text-white
                   font-mono text-sm placeholder-gray-600 focus:outline-none focus:border-neon-cyan transition-colors"
        />
        <p className="mt-2 text-xs text-gray-500">
          Game IDs are lowercase with no spaces (e.g., "monkey2" not "Monkey 2")
        </p>
      </div>

      {/* Game Title Input */}
      <div>
        <h4 className="font-display text-sm text-white mb-2">2. Enter Game Title</h4>
        <input
          type="text"
          value={gameTitle}
          onChange={(e) => {
            setGameTitle(e.target.value);
            setResult(null);
          }}
          placeholder="e.g., The Secret of Monkey Island"
          className="w-full px-4 py-3 rounded-lg bg-void-black border border-glass-border text-white
                   font-body text-sm placeholder-gray-600 focus:outline-none focus:border-neon-cyan transition-colors"
        />
        <p className="mt-2 text-xs text-gray-500">
          This is the display name that will appear in your library
        </p>
      </div>

      {/* Add Button */}
      <div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleImport}
          disabled={importing || !gameId.trim() || !gameTitle.trim()}
          className="w-full py-3 rounded-lg bg-neon-cyan text-void-black font-display text-sm font-bold
                   hover:bg-neon-cyan/90 transition-colors flex items-center justify-center gap-2
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {importing ? (
            <>
              <LoadingSpinner />
              Adding...
            </>
          ) : (
            <>
              <PlusIcon />
              Add ScummVM Game
            </>
          )}
        </motion.button>
      </div>

      {/* Result Message */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-lg border ${
            result.success
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <p className="font-body text-sm">{result.message}</p>
        </motion.div>
      )}

      {/* Common Game IDs Reference */}
      <div className="p-4 rounded-lg bg-glass-white border border-glass-border">
        <h5 className="font-display text-sm text-white mb-3">Common Game IDs</h5>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Monkey Island</span>
            <span className="font-mono text-neon-cyan">monkey</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Monkey Island 2</span>
            <span className="font-mono text-neon-cyan">monkey2</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Day of the Tentacle</span>
            <span className="font-mono text-neon-cyan">tentacle</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Sam & Max</span>
            <span className="font-mono text-neon-cyan">samnmax</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Full Throttle</span>
            <span className="font-mono text-neon-cyan">ft</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Indiana Jones 3</span>
            <span className="font-mono text-neon-cyan">indy3</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Indiana Jones 4</span>
            <span className="font-mono text-neon-cyan">atlantis</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">The Dig</span>
            <span className="font-mono text-neon-cyan">dig</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Grim Fandango</span>
            <span className="font-mono text-neon-cyan">grim</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Myst</span>
            <span className="font-mono text-neon-cyan">myst</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== PLATFORM DEFAULTS TAB ====================

function PlatformDefaultsTab() {
  const { platforms, emulators, loadLibrary } = useLibraryStore();
  const [saving, setSaving] = useState<string | null>(null);

  // Group platforms by manufacturer
  const groupedPlatforms = platforms.reduce((acc, platform) => {
    const group = platform.manufacturer || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(platform);
    return acc;
  }, {} as Record<string, Platform[]>);

  const handleSetDefault = async (platformId: string, emulatorId: string) => {
    setSaving(platformId);
    try {
      await setDefaultEmulator(platformId, emulatorId);
      await loadLibrary();
    } catch (error) {
      console.error('Failed to set default emulator:', error);
    } finally {
      setSaving(null);
    }
  };

  const getEmulatorsForPlatform = (platformId: string) => {
    return emulators.filter(e => e.supportedPlatformIds.includes(platformId));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-400 mb-4">
          Set the default emulator for each platform. When you launch a game, it will use this emulator unless a specific one is configured for that game.
        </p>
      </div>

      {Object.entries(groupedPlatforms).map(([manufacturer, platformList]) => (
        <div key={manufacturer}>
          <h4 className="font-display text-xs text-gray-500 uppercase tracking-wider mb-3">
            {manufacturer}
          </h4>
          <div className="space-y-2">
            {platformList.map(platform => {
              const availableEmulators = getEmulatorsForPlatform(platform.id);
              const currentDefault = platform.defaultEmulatorId;

              return (
                <div
                  key={platform.id}
                  className="p-4 bg-glass-white border border-glass-border rounded-lg flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${platform.color}22`, color: platform.color }}
                  >
                    {platform.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-white">{platform.displayName}</p>
                    <p className="text-xs text-gray-500">
                      {availableEmulators.length} emulator(s) available
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {availableEmulators.length === 0 ? (
                      <span className="text-xs text-gray-500 italic">No emulators configured</span>
                    ) : (
                      <select
                        value={currentDefault || ''}
                        onChange={(e) => handleSetDefault(platform.id, e.target.value)}
                        disabled={saving === platform.id}
                        className="px-3 py-2 bg-void-black border border-glass-border rounded-lg text-sm text-white
                                 focus:outline-none focus:border-neon-cyan min-w-[200px]
                                 disabled:opacity-50"
                      >
                        <option value="">-- Select Default --</option>
                        {availableEmulators.map(emu => (
                          <option key={emu.id} value={emu.id}>{emu.name}</option>
                        ))}
                      </select>
                    )}
                    {saving === platform.id && <LoadingSpinner />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {emulators.length === 0 && (
        <div className="p-8 border-2 border-dashed border-glass-border rounded-lg text-center">
          <p className="text-gray-500 text-sm mb-2">No emulators configured yet</p>
          <p className="text-gray-600 text-xs">Add emulators in the Emulators tab or set up RetroArch</p>
        </div>
      )}
    </div>
  );
}

// ==================== EMULATORS TAB ====================

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

function EmulatorsTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmulator, setEditingEmulator] = useState<Emulator | null>(null);
  const [formData, setFormData] = useState<EmulatorFormData>(defaultEmulatorForm);
  const [isValidPath, setIsValidPath] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const { emulators, platforms, loadLibrary, addEmulator: addEmulatorToStore, updateEmulator: updateEmulatorInStore, deleteEmulator: deleteEmulatorFromStore } = useLibraryStore();

  const groupedPlatforms = platforms.reduce((acc, platform) => {
    const group = platform.manufacturer || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(platform);
    return acc;
  }, {} as Record<string, Platform[]>);

  const handleBrowseExecutable = async () => {
    try {
      const isMacOS = navigator.platform.toLowerCase().includes('mac') ||
                      navigator.userAgent.toLowerCase().includes('mac');

      const selected = await open({
        multiple: false,
        title: isMacOS ? 'Select Emulator Application' : 'Select Emulator Executable',
        directory: false,
        filters: isMacOS ? undefined : [
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
        await updateEmulator(editingEmulator.id, {
          name: formData.name,
          executablePath: formData.executablePath,
          launchArguments: formData.launchArguments,
          supportedPlatformIds: formData.supportedPlatformIds,
        });
        updateEmulatorInStore(editingEmulator.id, formData);
      } else {
        const newEmulator = await addEmulator({
          name: formData.name,
          executablePath: formData.executablePath,
          launchArguments: formData.launchArguments,
          supportedPlatformIds: formData.supportedPlatformIds,
        });
        addEmulatorToStore(newEmulator);
      }
      await loadLibrary();
      setShowAddForm(false);
      setEditingEmulator(null);
      setFormData(defaultEmulatorForm);
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
    setIsValidPath(true);
    setShowAddForm(true);
  };

  const handleDelete = async (emulator: Emulator) => {
    const confirmed = await ask(`Delete "${emulator.name}"? This cannot be undone.`, {
      title: 'Delete Emulator',
      kind: 'warning',
    });

    if (confirmed) {
      await deleteEmulator(emulator.id);
      deleteEmulatorFromStore(emulator.id);
      await loadLibrary();
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingEmulator(null);
    setFormData(defaultEmulatorForm);
    setIsValidPath(null);
  };

  const togglePlatform = (platformId: string) => {
    const newPlatforms = formData.supportedPlatformIds.includes(platformId)
      ? formData.supportedPlatformIds.filter(id => id !== platformId)
      : [...formData.supportedPlatformIds, platformId];
    setFormData({ ...formData, supportedPlatformIds: newPlatforms });
  };

  return (
    <div className="space-y-6">
      {!showAddForm ? (
        <>
          <div className="flex justify-end">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 rounded-lg bg-neon-cyan text-void-black font-display text-sm font-bold
                       hover:bg-neon-cyan/90 transition-colors flex items-center gap-2"
            >
              <PlusIcon />
              Add Emulator
            </motion.button>
          </div>

          {emulators.length === 0 ? (
            <div className="p-8 border-2 border-dashed border-glass-border rounded-lg text-center">
              <p className="text-gray-500 text-sm">No emulators configured yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {emulators.map(emulator => (
                <div
                  key={emulator.id}
                  className="p-4 bg-glass-white border border-glass-border rounded-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display text-sm text-white mb-1">{emulator.name}</h4>
                      <p className="text-xs text-gray-500 truncate mb-2">{emulator.executablePath}</p>
                      <div className="flex flex-wrap gap-1">
                        {emulator.supportedPlatformIds.map(pId => {
                          const platform = platforms.find(p => p.id === pId);
                          if (!platform) return null;
                          return (
                            <span
                              key={pId}
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                backgroundColor: `${platform.color}22`,
                                color: platform.color,
                              }}
                            >
                              {platform.displayName}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEdit(emulator)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                      >
                        <EditIcon />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(emulator)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <TrashIcon />
                      </motion.button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <h4 className="font-display text-sm text-white">
            {editingEmulator ? 'Edit Emulator' : 'Add Emulator'}
          </h4>

          {/* Name */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., PCSX2, Dolphin..."
              className="w-full px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                       text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-cyan"
            />
          </div>

          {/* Executable Path */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Executable Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.executablePath}
                onChange={(e) => setFormData({ ...formData, executablePath: e.target.value })}
                placeholder="Path to emulator..."
                className={`flex-1 px-3 py-2 bg-glass-white border rounded-lg
                         text-sm text-white placeholder-gray-600 focus:outline-none ${
                           isValidPath === true ? 'border-green-500' :
                           isValidPath === false ? 'border-red-500' :
                           'border-glass-border focus:border-neon-cyan'
                         }`}
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleBrowseExecutable}
                className="px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                         text-sm text-gray-300 hover:text-white hover:border-neon-cyan transition-colors"
              >
                Browse
              </motion.button>
            </div>
          </div>

          {/* Launch Arguments */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Launch Arguments
            </label>
            <input
              type="text"
              value={formData.launchArguments}
              onChange={(e) => setFormData({ ...formData, launchArguments: e.target.value })}
              placeholder="{rom}"
              className="w-full px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                       text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-cyan"
            />
            <p className="text-xs text-gray-600 mt-1">
              Use {'{rom}'} for the game path, {'{title}'} for the game title
            </p>
          </div>

          {/* Supported Platforms */}
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
              Supported Platforms
            </label>
            <div className="max-h-48 overflow-y-auto space-y-3 p-2 bg-void-black/30 rounded-lg">
              {Object.entries(groupedPlatforms).map(([manufacturer, platformList]) => (
                <div key={manufacturer}>
                  <p className="text-xs text-gray-600 mb-1">{manufacturer}</p>
                  <div className="flex flex-wrap gap-1">
                    {platformList.map(platform => (
                      <button
                        key={platform.id}
                        onClick={() => togglePlatform(platform.id)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          formData.supportedPlatformIds.includes(platform.id)
                            ? 'bg-neon-cyan/30 text-neon-cyan border border-neon-cyan/50'
                            : 'bg-glass-white text-gray-400 border border-transparent hover:border-glass-border'
                        }`}
                      >
                        {platform.displayName}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg bg-glass-white text-gray-300 font-body text-sm
                       hover:text-white hover:bg-glass-border transition-colors"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSave}
              disabled={!formData.name || !formData.executablePath || saving}
              className="flex-1 py-2 rounded-lg bg-neon-cyan text-void-black font-display font-bold
                       hover:bg-neon-cyan/90 transition-colors disabled:opacity-50
                       flex items-center justify-center gap-2"
            >
              {saving ? <LoadingSpinner /> : null}
              {editingEmulator ? 'Update' : 'Add'} Emulator
            </motion.button>
          </div>

          {/* Launch Arguments Reference */}
          <div className="mt-6 p-4 rounded-lg bg-void-black/50 border border-glass-border">
            <h5 className="font-display text-sm text-neon-cyan mb-2">Common Launch Arguments</h5>
            <p className="text-xs text-gray-500 mb-3">
              These flags launch games directly without showing the emulator's GUI first.
              Copy the Launch Arguments below and paste them into the field above.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-glass-border">
                    <th className="pb-2 pr-4">Emulator</th>
                    <th className="pb-2 pr-4">Platforms</th>
                    <th className="pb-2">Launch Arguments</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-glass-border/50">
                    <td className="py-2 pr-4 text-white">PCSX2</td>
                    <td className="py-2 pr-4">PS2</td>
                    <td className="py-2 font-mono text-neon-cyan">-batch "{'{rom}'}"</td>
                  </tr>
                  <tr className="border-b border-glass-border/50">
                    <td className="py-2 pr-4 text-white">DuckStation</td>
                    <td className="py-2 pr-4">PS1</td>
                    <td className="py-2 font-mono text-neon-cyan">-batch -- "{'{rom}'}"</td>
                  </tr>
                  <tr className="border-b border-glass-border/50">
                    <td className="py-2 pr-4 text-white">RPCS3</td>
                    <td className="py-2 pr-4">PS3</td>
                    <td className="py-2 font-mono text-neon-cyan">--no-gui "{'{rom}'}"</td>
                  </tr>
                  <tr className="border-b border-glass-border/50">
                    <td className="py-2 pr-4 text-white">PPSSPP</td>
                    <td className="py-2 pr-4">PSP</td>
                    <td className="py-2 font-mono text-neon-cyan">"{'{rom}'}"</td>
                  </tr>
                  <tr className="border-b border-glass-border/50">
                    <td className="py-2 pr-4 text-white">Dolphin</td>
                    <td className="py-2 pr-4">GC, Wii</td>
                    <td className="py-2 font-mono text-neon-cyan">-b -e "{'{rom}'}"</td>
                  </tr>
                  <tr className="border-b border-glass-border/50">
                    <td className="py-2 pr-4 text-white">Cemu</td>
                    <td className="py-2 pr-4">Wii U</td>
                    <td className="py-2 font-mono text-neon-cyan">-g "{'{rom}'}"</td>
                  </tr>
                  <tr className="border-b border-glass-border/50">
                    <td className="py-2 pr-4 text-white">Ryujinx</td>
                    <td className="py-2 pr-4">Switch</td>
                    <td className="py-2 font-mono text-neon-cyan">"{'{rom}'}"</td>
                  </tr>
                  <tr className="border-b border-glass-border/50">
                    <td className="py-2 pr-4 text-white">Citra</td>
                    <td className="py-2 pr-4">3DS</td>
                    <td className="py-2 font-mono text-neon-cyan">"{'{rom}'}"</td>
                  </tr>
                  <tr className="border-b border-glass-border/50">
                    <td className="py-2 pr-4 text-white">melonDS</td>
                    <td className="py-2 pr-4">DS</td>
                    <td className="py-2 font-mono text-neon-cyan">"{'{rom}'}"</td>
                  </tr>
                  <tr className="border-b border-glass-border/50">
                    <td className="py-2 pr-4 text-white">mGBA</td>
                    <td className="py-2 pr-4">GBA, GBC, GB</td>
                    <td className="py-2 font-mono text-neon-cyan">-f "{'{rom}'}"</td>
                  </tr>
                  <tr className="border-b border-glass-border/50">
                    <td className="py-2 pr-4 text-white">Xemu</td>
                    <td className="py-2 pr-4">Xbox</td>
                    <td className="py-2 font-mono text-neon-cyan">-dvd_path "{'{rom}'}"</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4 text-white">RetroArch</td>
                    <td className="py-2 pr-4">Multi</td>
                    <td className="py-2 font-mono text-neon-cyan">-L /path/to/core "{'{rom}'}"</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== RETROARCH TAB ====================

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
  'ppsspp': ['psp'],
  'dolphin': ['gamecube', 'wii'],
  'citra': ['3ds'],
  'fbneo': ['arcade'],
  'mame': ['arcade'],
};

interface CoreWithPlatforms extends RetroArchCore {
  suggestedPlatforms: string[];
  selectedPlatforms: string[];
  enabled: boolean;
}

function RetroArchTab() {
  const [retroArchPath, setRetroArchPath] = useState('');
  const [coresPath, setCoresPath] = useState('');
  const [cores, setCores] = useState<CoreWithPlatforms[]>([]);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const { platforms, emulators, loadLibrary, addEmulator: addEmulatorToStore } = useLibraryStore();

  useEffect(() => {
    const loadSettings = async () => {
      const savedPath = await getSetting('retroarch_path');
      const savedCoresPath = await getSetting('retroarch_cores_path');
      if (savedPath) setRetroArchPath(savedPath);
      if (savedCoresPath) {
        setCoresPath(savedCoresPath);
      } else {
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

      const coresWithPlatforms: CoreWithPlatforms[] = foundCores.map(core => {
        const coreName = core.displayName.toLowerCase().replace(/\s+/g, '-');
        let suggestedPlatforms: string[] = [];

        for (const [coreKey, platformIds] of Object.entries(coreToPlatformMap)) {
          if (coreName.includes(coreKey) || core.fileName.toLowerCase().includes(coreKey)) {
            suggestedPlatforms = platformIds;
            break;
          }
        }

        const existingEmulator = emulators.find(e =>
          e.launchArguments.includes(core.fullPath)
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
        const existingEmulator = emulators.find(e =>
          e.launchArguments.includes(core.fullPath)
        );

        if (!existingEmulator) {
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

  const groupedPlatforms = platforms.reduce((acc, platform) => {
    const group = platform.manufacturer || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(platform);
    return acc;
  }, {} as Record<string, Platform[]>);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-gray-400 mb-4">
          Configure RetroArch and its cores. Each enabled core will be added as a separate emulator entry.
        </p>
      </div>

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
            className="px-4 py-2 bg-glass-white border border-glass-border rounded-lg
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
            className="px-4 py-2 bg-glass-white border border-glass-border rounded-lg
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
        className="w-full py-3 rounded-lg bg-neon-magenta/20 border border-neon-magenta/50
                 text-neon-magenta font-display hover:bg-neon-magenta/30 transition-colors
                 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {scanning ? (
          <>
            <LoadingSpinner />
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-white">Found {cores.length} cores</p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSaveEnabledCores}
              disabled={saving || !cores.some(c => c.enabled)}
              className="px-4 py-2 rounded-lg bg-neon-magenta text-void-black font-display text-sm font-bold
                       hover:bg-neon-magenta/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Enabled Cores'}
            </motion.button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {cores.map((core, index) => (
              <div
                key={core.fileName}
                className={`p-4 rounded-lg border transition-colors ${
                  core.enabled
                    ? 'bg-neon-magenta/10 border-neon-magenta/50'
                    : 'bg-glass-white border-glass-border'
                }`}
              >
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={core.enabled}
                    onChange={() => toggleCoreEnabled(index)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="font-body text-white">{core.displayName}</span>
                </label>

                {core.enabled && (
                  <div className="mt-3 pl-7">
                    <p className="text-xs text-gray-500 mb-2">Platforms:</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.values(groupedPlatforms).flat().map(platform => {
                        const isSelected = core.selectedPlatforms.includes(platform.id);
                        const isSuggested = core.suggestedPlatforms.includes(platform.id);

                        return (
                          <button
                            key={platform.id}
                            onClick={() => toggleCorePlatform(index, platform.id)}
                            className={`px-2 py-1 rounded text-xs transition-colors ${
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
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== METADATA TAB ====================

function MetadataTab() {
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [validating, setValidating] = useState(false);
  const [credentialsValid, setCredentialsValid] = useState<boolean | null>(null);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const { games, loadLibrary } = useLibraryStore();
  const {
    batchScraping,
    batchScrapeLog,
    batchScrapeResult,
    startBatchScrape,
    cancelBatchScrape,
    clearBatchScrapeResult,
  } = useUIStore();
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadCredentials = async () => {
      const savedClientId = await getSetting('igdb_client_id');
      const savedClientSecret = await getSetting('igdb_client_secret');
      if (savedClientId) setClientId(savedClientId);
      if (savedClientSecret) setClientSecret(savedClientSecret);
    };
    loadCredentials();
  }, []);

  const handleSaveCredentials = async () => {
    await setSetting('igdb_client_id', clientId);
    await setSetting('igdb_client_secret', clientSecret);
    setCredentialsValid(null);
  };

  const handleValidateCredentials = async () => {
    if (!clientId || !clientSecret) return;

    setValidating(true);
    setCredentialsValid(null);
    try {
      await handleSaveCredentials();
      const valid = await validateIgdbCredentials(clientId, clientSecret);
      setCredentialsValid(valid);
    } catch (error) {
      console.error('Failed to validate credentials:', error);
      setCredentialsValid(false);
    } finally {
      setValidating(false);
    }
  };

  const handleBatchScrape = () => {
    // Determine which games to scrape
    const gamesToScrape = onlyMissing
      ? games.filter(g => !g.description && !g.coverArtPath)
      : games;

    // Clear any previous result before starting
    clearBatchScrapeResult();

    // Start the batch scrape (runs in background via global store)
    startBatchScrape(gamesToScrape, loadLibrary);
  };

  const gamesWithoutMetadata = games.filter(g => !g.description && !g.coverArtPath).length;

  return (
    <div className="space-y-8">
      {/* IGDB API Credentials */}
      <div>
        <h4 className="font-display text-sm text-white mb-2">IGDB API Credentials</h4>
        <p className="text-xs text-gray-500 mb-4">
          Get your credentials from the{' '}
          <a
            href="https://api-docs.igdb.com/#getting-started"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neon-cyan hover:underline"
          >
            Twitch Developer Portal
          </a>
          . You need a Twitch account and to register an application.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Client ID
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setCredentialsValid(null);
              }}
              placeholder="Your Twitch Client ID"
              className="w-full px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                       text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-cyan"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1">
              Client Secret
            </label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => {
                setClientSecret(e.target.value);
                setCredentialsValid(null);
              }}
              placeholder="Your Twitch Client Secret"
              className="w-full px-3 py-2 bg-glass-white border border-glass-border rounded-lg
                       text-sm text-white placeholder-gray-600 focus:outline-none focus:border-neon-cyan"
            />
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleValidateCredentials}
              disabled={!clientId || !clientSecret || validating}
              className="px-4 py-2 rounded-lg bg-neon-cyan text-void-black font-display text-sm font-bold
                       hover:bg-neon-cyan/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-2"
            >
              {validating ? (
                <>
                  <LoadingSpinner />
                  Validating...
                </>
              ) : (
                'Validate & Save'
              )}
            </motion.button>

            {credentialsValid === true && (
              <span className="text-green-400 text-sm flex items-center gap-1">
                <CheckIcon />
                Valid credentials
              </span>
            )}
            {credentialsValid === false && (
              <span className="text-red-400 text-sm flex items-center gap-1">
                <XIcon />
                Invalid credentials
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Batch Scraping */}
      <div>
        <h4 className="font-display text-sm text-white mb-2">Batch Metadata Scraping</h4>
        <p className="text-xs text-gray-500 mb-4">
          Automatically fetch cover art and metadata for your game library from IGDB.
          This may take a while for large libraries.
        </p>

        <div className="p-4 bg-glass-white border border-glass-border rounded-lg mb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-white">Library Status</p>
              <p className="text-xs text-gray-500">
                {games.length} games total, {gamesWithoutMetadata} without metadata
              </p>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyMissing}
              onChange={(e) => setOnlyMissing(e.target.checked)}
              className="w-4 h-4 rounded accent-neon-cyan"
            />
            <span className="text-sm text-gray-300">Only scrape games without existing metadata</span>
          </label>
        </div>

        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleBatchScrape}
            disabled={batchScraping || games.length === 0}
            className="flex-1 py-3 rounded-lg bg-neon-orange text-void-black font-display font-bold
                     hover:bg-neon-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center justify-center gap-2"
          >
            {batchScraping ? (
              <>
                <LoadingSpinner />
                Scraping Library...
              </>
            ) : (
              <>
                <DownloadIcon />
                Scrape All Games
              </>
            )}
          </motion.button>

          {batchScraping && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={cancelBatchScrape}
              className="px-4 py-3 rounded-lg bg-red-500/20 text-red-400 font-display font-bold
                       hover:bg-red-500/30 transition-colors flex items-center justify-center"
            >
              Cancel
            </motion.button>
          )}
        </div>

        {/* Scrape Log - shown during scraping */}
        {batchScrapeLog.length > 0 && (
          <div className="mt-4 p-4 bg-glass-white border border-glass-border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-display text-sm text-white">Scraping Progress</h5>
              <span className="text-xs text-gray-400 font-body">
                {batchScrapeLog.filter(e => e.status === 'success' || e.status === 'failed').length} / {batchScrapeLog.length}
              </span>
            </div>
            <div
              ref={logContainerRef}
              className="max-h-48 overflow-y-auto space-y-1 font-body text-xs"
            >
              {batchScrapeLog.map((entry) => (
                <div
                  key={entry.gameId}
                  className={`flex items-center gap-2 py-1 px-2 rounded ${
                    entry.status === 'scraping' ? 'bg-neon-cyan/10' : ''
                  }`}
                >
                  {entry.status === 'pending' && (
                    <span className="w-4 h-4 text-gray-600">○</span>
                  )}
                  {entry.status === 'scraping' && (
                    <span className="w-4 h-4"><LoadingSpinner /></span>
                  )}
                  {entry.status === 'success' && (
                    <span className="w-4 h-4 text-green-400">✓</span>
                  )}
                  {entry.status === 'failed' && (
                    <span className="w-4 h-4 text-red-400">✗</span>
                  )}
                  <span className={`truncate ${
                    entry.status === 'scraping' ? 'text-neon-cyan' :
                    entry.status === 'success' ? 'text-gray-300' :
                    entry.status === 'failed' ? 'text-red-300' :
                    'text-gray-500'
                  }`}>
                    {entry.title}
                  </span>
                  {entry.status === 'scraping' && (
                    <span className="text-gray-500 ml-auto">fetching...</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {batchScrapeResult && (
          <div className="mt-4 p-4 bg-glass-white border border-glass-border rounded-lg">
            <h5 className="font-display text-sm text-white mb-2">Scrape Results</h5>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-display text-2xl text-neon-cyan">{batchScrapeResult.total}</p>
                <p className="text-xs text-gray-500">Processed</p>
              </div>
              <div>
                <p className="font-display text-2xl text-green-400">{batchScrapeResult.successful}</p>
                <p className="text-xs text-gray-500">Successful</p>
              </div>
              <div>
                <p className="font-display text-2xl text-red-400">{batchScrapeResult.failed}</p>
                <p className="text-xs text-gray-500">Failed</p>
              </div>
            </div>
            {batchScrapeResult.errors.length > 0 && (
              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-300 max-h-24 overflow-y-auto">
                {batchScrapeResult.errors.slice(0, 5).map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
                {batchScrapeResult.errors.length > 5 && (
                  <p className="text-gray-500">...and {batchScrapeResult.errors.length - 5} more</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== APPEARANCE TAB ====================

function AppearanceTab() {
  const settings = useSettingsStore();

  return (
    <div className="space-y-6">
      {/* Visual Effects */}
      <div>
        <h4 className="font-display text-sm text-white mb-4">Visual Effects</h4>
        <div className="space-y-4">
          <ToggleSetting
            label="Scanlines"
            description="CRT-style scanline overlay on game cards"
            value={settings.enableScanlines}
            onChange={(v) => settings.updateSettings({ enableScanlines: v })}
          />
          <ToggleSetting
            label="Particles"
            description="Floating particle effects in the background"
            value={settings.enableParticles}
            onChange={(v) => settings.updateSettings({ enableParticles: v })}
          />
          <ToggleSetting
            label="3D Effects"
            description="Enable 3D shelf view and card effects"
            value={settings.enable3DEffects}
            onChange={(v) => settings.updateSettings({ enable3DEffects: v })}
          />
        </div>
      </div>

      {/* 3D Quality */}
      {settings.enable3DEffects && (
        <div>
          <h4 className="font-display text-sm text-white mb-4">3D Rendering Quality</h4>
          <p className="text-xs text-gray-400 mb-4">
            Higher quality settings render at higher resolution for sharper visuals, but require more GPU power.
          </p>
          <Quality3DSelector
            value={settings.quality3D}
            onChange={(v) => settings.updateSettings({ quality3D: v })}
          />
        </div>
      )}

      {/* Theme */}
      <div>
        <h4 className="font-display text-sm text-white mb-4">Theme</h4>
        <div className="grid grid-cols-2 gap-4">
          <ThemeCard
            name="Cyberpunk"
            selected={settings.theme === 'cyberpunk'}
            onClick={() => settings.updateSettings({ theme: 'cyberpunk' })}
            color="#00f5ff"
          />
          <ThemeCard
            name="Minimal"
            selected={settings.theme === 'minimal'}
            onClick={() => settings.updateSettings({ theme: 'minimal' })}
            color="#c4a574"
          />
          <ThemeCard
            name="Retro CRT"
            selected={settings.theme === 'retro-crt'}
            onClick={() => settings.updateSettings({ theme: 'retro-crt' })}
            color="#ff6b35"
          />
          <ThemeCard
            name="Terminal"
            selected={settings.theme === 'retro-terminal'}
            onClick={() => settings.updateSettings({ theme: 'retro-terminal' })}
            color="#00ff41"
          />
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-glass-white border border-glass-border rounded-lg">
      <div>
        <p className="font-body text-sm text-white">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors relative ${
          value ? 'bg-neon-cyan' : 'bg-gray-600'
        }`}
      >
        <motion.div
          animate={{ x: value ? 24 : 2 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
        />
      </button>
    </div>
  );
}

// Quality tier definitions with labels and descriptions
const qualityTiers: {
  id: Quality3D;
  label: string;
  description: string;
  warning?: string;
}[] = [
  {
    id: 'performance',
    label: 'Performance',
    description: '1x resolution - Best for older or integrated GPUs',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: '1.5x resolution - Good balance of quality and performance',
  },
  {
    id: 'high',
    label: 'High',
    description: '2x resolution - Recommended for most dedicated GPUs',
  },
  {
    id: 'ultra',
    label: 'Ultra',
    description: 'Up to 3x resolution - For high-end GPUs',
    warning: 'May impact performance on some systems',
  },
  {
    id: 'maximum',
    label: 'Maximum',
    description: 'Native display resolution - Best visual quality',
    warning: 'High GPU load - only recommended for powerful graphics cards',
  },
];

function Quality3DSelector({
  value,
  onChange,
}: {
  value: Quality3D;
  onChange: (value: Quality3D) => void;
}) {
  return (
    <div className="space-y-2">
      {qualityTiers.map((tier) => (
        <motion.button
          key={tier.id}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onChange(tier.id)}
          className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
            value === tier.id
              ? 'border-neon-cyan bg-neon-cyan/10'
              : 'border-glass-border bg-glass-white hover:border-gray-500'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={`font-body text-sm font-medium ${
                  value === tier.id ? 'text-neon-cyan' : 'text-white'
                }`}>
                  {tier.label}
                </p>
                {tier.warning && (
                  <span className="text-xs text-neon-orange px-2 py-0.5 bg-neon-orange/10 rounded">
                    GPU Intensive
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">{tier.description}</p>
              {tier.warning && value === tier.id && (
                <p className="text-xs text-neon-orange mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {tier.warning}
                </p>
              )}
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              value === tier.id
                ? 'border-neon-cyan bg-neon-cyan'
                : 'border-gray-500'
            }`}>
              {value === tier.id && (
                <svg className="w-3 h-3 text-void-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

function ThemeCard({
  name,
  selected,
  onClick,
  color,
}: {
  name: string;
  selected: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-lg border-2 transition-colors ${
        selected
          ? 'border-neon-cyan bg-neon-cyan/10'
          : 'border-glass-border bg-glass-white hover:border-gray-500'
      }`}
    >
      <div
        className="w-full h-16 rounded mb-3"
        style={{ background: `linear-gradient(135deg, ${color}33 0%, #1a102566 100%)` }}
      />
      <p className={`font-body text-sm ${selected ? 'text-neon-cyan' : 'text-gray-400'}`}>
        {name}
      </p>
    </motion.button>
  );
}

// ==================== ICONS ====================

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function FolderIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function ManualImportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ScummVMIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4 4h-2v-2h2v2zm0-4h-2V7h2v5z"/>
    </svg>
  );
}

function PlatformIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  );
}

function GamepadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  );
}

function RetroArchIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.18l6.9 3.45L12 11.09 5.1 7.63 12 4.18zM4 8.82l7 3.5v6.36l-7-3.5V8.82zm9 9.86v-6.36l7-3.5v6.36l-7 3.5z"/>
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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

function EditIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function MetadataIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}
