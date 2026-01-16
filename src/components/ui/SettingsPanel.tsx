import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore, useSettingsStore } from '../../stores';
import { useTheme } from '../../hooks/useTheme';

export function SettingsPanel() {
  const { settingsPanelOpen, setSettingsPanelOpen, openFullSettings } = useUIStore();
  const settings = useSettingsStore();
  const theme = useTheme();

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
            className="fixed inset-0 backdrop-blur-sm z-40"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm z-50 flex flex-col"
            style={{
              backgroundColor: 'var(--theme-bg-secondary)',
              borderLeft: '1px solid var(--theme-border)',
            }}
          >
            {/* Header */}
            <div
              className="p-6 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--theme-border)' }}
            >
              <h2 className="font-display text-xl font-bold" style={{ color: 'var(--theme-text)' }}>Quick Settings</h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setSettingsPanelOpen(false)}
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Visual Effects */}
              <section>
                <h3
                  className="font-display text-sm uppercase tracking-wider mb-4"
                  style={{ color: theme.accent }}
                >
                  Visual Effects
                </h3>
                <div className="space-y-4">
                  <ToggleSetting
                    label="Scanlines"
                    description="CRT-style scanline overlay"
                    value={settings.enableScanlines}
                    onChange={(v) => settings.updateSettings({ enableScanlines: v })}
                    theme={theme}
                  />
                  <ToggleSetting
                    label="Particles"
                    description="Floating particle effects"
                    value={settings.enableParticles}
                    onChange={(v) => settings.updateSettings({ enableParticles: v })}
                    theme={theme}
                  />
                  <ToggleSetting
                    label="3D Effects"
                    description="Enable 3D shelf view and effects"
                    value={settings.enable3DEffects}
                    onChange={(v) => settings.updateSettings({ enable3DEffects: v })}
                    theme={theme}
                  />
                </div>
              </section>

              {/* Theme */}
              <section>
                <h3
                  className="font-display text-sm uppercase tracking-wider mb-4"
                  style={{ color: theme.accent }}
                >
                  Theme
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <ThemeOption
                    name="Cyberpunk"
                    value="cyberpunk"
                    selected={settings.theme === 'cyberpunk'}
                    onClick={() => settings.updateSettings({ theme: 'cyberpunk' })}
                    color="#00f5ff"
                    theme={theme}
                  />
                  <ThemeOption
                    name="Minimal"
                    value="minimal"
                    selected={settings.theme === 'minimal'}
                    onClick={() => settings.updateSettings({ theme: 'minimal' })}
                    color="#c4a574"
                    theme={theme}
                  />
                  <ThemeOption
                    name="Retro CRT"
                    value="retro-crt"
                    selected={settings.theme === 'retro-crt'}
                    onClick={() => settings.updateSettings({ theme: 'retro-crt' })}
                    color="#ff6b35"
                    theme={theme}
                  />
                  <ThemeOption
                    name="Terminal"
                    value="retro-terminal"
                    selected={settings.theme === 'retro-terminal'}
                    onClick={() => settings.updateSettings({ theme: 'retro-terminal' })}
                    color="#00ff41"
                    theme={theme}
                  />
                </div>
              </section>

              {/* Launch Settings */}
              <section>
                <h3
                  className="font-display text-sm uppercase tracking-wider mb-4"
                  style={{ color: theme.accent }}
                >
                  Launch Settings
                </h3>
                <div className="space-y-4">
                  <ToggleSetting
                    label="Fullscreen"
                    description="Launch games in fullscreen mode"
                    value={settings.launchInFullscreen}
                    onChange={(v) => settings.updateSettings({ launchInFullscreen: v })}
                    theme={theme}
                  />
                </div>
              </section>

              {/* Full Settings Button */}
              <section>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleOpenFullSettings}
                  className="w-full py-3 rounded-lg transition-all flex items-center justify-center gap-3 group"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    border: '1px solid var(--theme-border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = theme.accent;
                    e.currentTarget.style.backgroundColor = theme.accentMuted;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--theme-border)';
                    e.currentTarget.style.backgroundColor = 'var(--theme-surface)';
                  }}
                >
                  <SettingsGearIcon style={{ color: 'var(--theme-text-muted)' }} className="group-hover:text-accent transition-colors" />
                  <span
                    className="font-display text-sm transition-colors"
                    style={{ color: 'var(--theme-text-secondary)' }}
                  >
                    Open Full Settings
                  </span>
                  <ChevronRightIcon style={{ color: 'var(--theme-text-muted)' }} className="transition-colors" />
                </motion.button>
                <p className="text-xs text-center mt-2" style={{ color: 'var(--theme-text-muted)' }}>
                  Library, emulators, RetroArch, platform defaults
                </p>
              </section>

              {/* About */}
              <section>
                <h3
                  className="font-display text-sm uppercase tracking-wider mb-4"
                  style={{ color: theme.accent }}
                >
                  About
                </h3>
                <div
                  className="rounded-lg p-4"
                  style={{
                    backgroundColor: 'var(--theme-surface)',
                    border: '1px solid var(--theme-border)',
                  }}
                >
                  <p className="font-display text-lg mb-1" style={{ color: 'var(--theme-text)' }}>RetroVoid</p>
                  <p className="font-body text-sm mb-3" style={{ color: 'var(--theme-text-muted)' }}>Version 0.1.0</p>
                  <p className="font-body text-xs" style={{ color: 'var(--theme-text-muted)' }}>
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
  theme: ReturnType<typeof useTheme>;
}

function ToggleSetting({ label, description, value, onChange, theme }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-body text-sm" style={{ color: 'var(--theme-text)' }}>{label}</p>
        <p className="font-body text-xs" style={{ color: 'var(--theme-text-muted)' }}>{description}</p>
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => onChange(!value)}
        className="relative w-12 h-6 rounded-full transition-colors"
        style={{
          backgroundColor: value ? theme.accent : 'var(--theme-surface)',
        }}
      >
        <motion.div
          animate={{ x: value ? 24 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 w-4 h-4 rounded-full transition-colors"
          style={{
            backgroundColor: value ? 'var(--theme-bg)' : 'var(--theme-text-muted)',
          }}
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
  theme: ReturnType<typeof useTheme>;
}

function ThemeOption({ name, selected, onClick, color, theme }: ThemeOptionProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="p-3 rounded-lg transition-all"
      style={{
        backgroundColor: selected ? theme.accentMuted : 'var(--theme-surface)',
        border: selected ? `1px solid ${theme.accent}` : '1px solid var(--theme-border)',
      }}
    >
      <div
        className="w-full h-2 rounded mb-2"
        style={{ backgroundColor: color }}
      />
      <p className="font-body text-xs" style={{ color: 'var(--theme-text)' }}>{name}</p>
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

function SettingsGearIcon({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={`w-5 h-5 ${className}`} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ChevronRightIcon({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={`w-4 h-4 ${className}`} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}
