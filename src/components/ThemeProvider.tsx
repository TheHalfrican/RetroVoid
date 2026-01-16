import { useEffect } from 'react';
import { useSettingsStore } from '../stores';
import { getThemeConfig } from '../config/themes';

/**
 * ThemeProvider - Applies theme CSS variables to the document root
 *
 * This component watches the theme setting and updates CSS custom properties
 * so that all UI components can use theme colors via var(--theme-*)
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useSettingsStore();

  useEffect(() => {
    const config = getThemeConfig(theme);
    const root = document.documentElement;

    // Base colors
    root.style.setProperty('--theme-bg', config.background);
    root.style.setProperty('--theme-bg-secondary', config.backgroundSecondary);
    root.style.setProperty('--theme-surface', config.surface);
    root.style.setProperty('--theme-surface-hover', config.surfaceHover);
    root.style.setProperty('--theme-border', config.border);
    root.style.setProperty('--theme-border-hover', config.borderHover);

    // Text colors
    root.style.setProperty('--theme-text', config.textPrimary);
    root.style.setProperty('--theme-text-secondary', config.textSecondary);
    root.style.setProperty('--theme-text-muted', config.textMuted);

    // Accent colors
    root.style.setProperty('--theme-accent', config.accent);
    root.style.setProperty('--theme-accent-hover', config.accentHover);
    root.style.setProperty('--theme-accent-muted', config.accentMuted);
    root.style.setProperty('--theme-accent-secondary', config.accentSecondary);

    // Scrollbar
    root.style.setProperty('--theme-scrollbar-track', config.scrollbarTrack);
    root.style.setProperty('--theme-scrollbar-thumb', config.scrollbarThumb);
    root.style.setProperty('--theme-scrollbar-thumb-hover', config.scrollbarThumbHover);

    // Phosphor glow (CRT effect)
    const glowEnabled = config.scene.enablePhosphorGlow;
    const glowColor = config.scene.phosphorGlowColor;
    const glowSpread = config.scene.phosphorGlowSpread;

    root.style.setProperty('--theme-phosphor-glow-color', glowColor);
    root.style.setProperty('--theme-phosphor-glow-spread', `${glowSpread}px`);

    // Pre-computed glow shadows for easy use in components
    // Text glow: multiple layers for that soft phosphor bleed
    const textGlow = glowEnabled
      ? `0 0 ${glowSpread * 0.5}px ${glowColor}, 0 0 ${glowSpread}px ${glowColor}40, 0 0 ${glowSpread * 2}px ${glowColor}20`
      : 'none';
    root.style.setProperty('--theme-text-glow', textGlow);

    // Accent text glow (for headers, important text)
    const accentTextGlow = glowEnabled
      ? `0 0 ${glowSpread * 0.75}px ${glowColor}, 0 0 ${glowSpread * 1.5}px ${glowColor}60, 0 0 ${glowSpread * 3}px ${glowColor}30`
      : 'none';
    root.style.setProperty('--theme-accent-text-glow', accentTextGlow);

    // Box/border glow for UI elements
    const boxGlow = glowEnabled
      ? `0 0 ${glowSpread}px ${glowColor}50, 0 0 ${glowSpread * 2}px ${glowColor}25, inset 0 0 ${glowSpread * 0.5}px ${glowColor}15`
      : 'none';
    root.style.setProperty('--theme-box-glow', boxGlow);

    // Subtle glow for borders
    const borderGlow = glowEnabled
      ? `0 0 ${glowSpread * 0.5}px ${glowColor}40`
      : 'none';
    root.style.setProperty('--theme-border-glow', borderGlow);

    // Update body background for non-3D views
    document.body.style.backgroundColor = config.background;

  }, [theme]);

  return <>{children}</>;
}

export default ThemeProvider;
