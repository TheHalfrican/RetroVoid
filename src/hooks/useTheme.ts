import { useMemo } from 'react';
import { useSettingsStore } from '../stores';
import { getThemeConfig, type ThemeConfig } from '../config/themes';

/**
 * Hook to access the current theme configuration
 * Returns the full theme config based on the user's selected theme
 */
export function useTheme(): ThemeConfig {
  const { theme } = useSettingsStore();
  return useMemo(() => getThemeConfig(theme), [theme]);
}

/**
 * Hook to access just the 3D scene settings from the current theme
 */
export function useThemeScene() {
  const theme = useTheme();
  return theme.scene;
}

/**
 * Hook to check if the current theme is a specific mode
 */
export function useIsTheme(mode: 'cyberpunk' | 'minimal' | 'retro-crt'): boolean {
  const { theme } = useSettingsStore();
  return theme === mode;
}
