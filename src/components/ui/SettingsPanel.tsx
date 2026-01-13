import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore, useSettingsStore } from '../../stores';

export function SettingsPanel() {
  const { settingsPanelOpen, setSettingsPanelOpen, openFullSettings } = useUIStore();
  const settings = useSettingsStore();

  const handleOpenFullSettings = () => {
    setSettingsPanelOpen(false);
    openFullSettings();
  };

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
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-deep-purple border-l border-glass-border z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-glass-border flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">Quick Settings</h2>
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

              {/* Full Settings Button */}
              <section>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenFullSettings}
                  className="w-full py-3 rounded-lg bg-glass-white border border-glass-border
                           hover:border-neon-cyan hover:bg-neon-cyan/10 transition-all
                           flex items-center justify-center gap-3 group"
                >
                  <SettingsGearIcon className="text-gray-400 group-hover:text-neon-cyan transition-colors" />
                  <span className="font-display text-sm text-gray-300 group-hover:text-white transition-colors">
                    Open Full Settings
                  </span>
                  <ChevronRightIcon className="text-gray-500 group-hover:text-neon-cyan transition-colors" />
                </motion.button>
                <p className="text-xs text-gray-600 text-center mt-2">
                  Library, emulators, RetroArch, platform defaults
                </p>
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
function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SettingsGearIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-5 h-5 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ChevronRightIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
