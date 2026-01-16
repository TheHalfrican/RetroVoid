import type { ThemeMode } from '../types';

/**
 * Theme configuration for RetroVoid
 * Defines colors, 3D settings, and UI properties for each theme
 */

export interface ThemeConfig {
  // Base colors
  background: string;
  backgroundSecondary: string;
  surface: string;
  surfaceHover: string;
  border: string;
  borderHover: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accent colors
  accent: string;
  accentHover: string;
  accentMuted: string;
  accentSecondary: string;

  // 3D Scene settings
  scene: {
    // Environment
    backgroundColor: string;
    primaryLightColor: string;
    secondaryLightColor: string;
    accentLightColor: string;
    showGrid: boolean;
    gridColor: string;
    gridSecondaryColor: string;
    showParticles: boolean;
    particleColor: string;

    // Post-processing
    enableBloom: boolean;
    bloomIntensity: number;
    bloomThreshold: number;
    enableChromaticAberration: boolean;
    chromaticAberrationOffset: number;
    enableVignette: boolean;
    vignetteDarkness: number;
    enableNoise: boolean;
    noiseOpacity: number;

    // CRT effects
    enableBarrelDistortion: boolean;
    barrelDistortion: number;
    barrelDistortionScale: number;

    // Phosphor glow (CRT light bleed effect)
    enablePhosphorGlow: boolean;
    phosphorGlowColor: string;
    phosphorGlowIntensity: number;  // For 3D post-processing (0-1)
    phosphorGlowSpread: number;     // For CSS blur radius in pixels

    // CRT frame (hard-edge black border)
    enableCRTFrame: boolean;
    crtFrameRadius: number;         // Where the black border starts (0-1, lower = larger visible area)
    crtFrameSoftness: number;       // Softness of the edge transition (higher = softer)

    // Card effects
    enableHolographicShader: boolean;
    cardGlowColor: string;
    cardScanlineIntensity: number;
    cardShimmerIntensity: number;
    cardEdgeGlow: number;

    // Shelf
    shelfColor: string;
    shelfEmissiveIntensity: number;
  };

  // Scrollbar
  scrollbarTrack: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
}

export const themes: Record<ThemeMode, ThemeConfig> = {
  cyberpunk: {
    // Base colors
    background: '#0a0a0f',
    backgroundSecondary: '#1a1025',
    surface: 'rgba(255, 255, 255, 0.05)',
    surfaceHover: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderHover: 'rgba(255, 255, 255, 0.2)',

    // Text colors
    textPrimary: '#ffffff',
    textSecondary: '#b0b0b0',
    textMuted: '#666666',

    // Accent colors
    accent: '#00f5ff',
    accentHover: '#00d4dd',
    accentMuted: 'rgba(0, 245, 255, 0.2)',
    accentSecondary: '#ff00ff',

    // 3D Scene settings
    scene: {
      backgroundColor: '#0a0a0f',
      primaryLightColor: '#00f5ff',
      secondaryLightColor: '#ff00ff',
      accentLightColor: '#ff6b35',
      showGrid: true,
      gridColor: '#00f5ff',
      gridSecondaryColor: '#ff00ff',
      showParticles: true,
      particleColor: '#00f5ff',

      enableBloom: true,
      bloomIntensity: 0.6,
      bloomThreshold: 0.7,
      enableChromaticAberration: true,
      chromaticAberrationOffset: 0.0005,
      enableVignette: true,
      vignetteDarkness: 0.7,
      enableNoise: true,
      noiseOpacity: 0.02,

      // CRT effects - disabled for cyberpunk
      enableBarrelDistortion: false,
      barrelDistortion: 0,
      barrelDistortionScale: 1,

      // Phosphor glow - disabled for cyberpunk
      enablePhosphorGlow: false,
      phosphorGlowColor: '#00f5ff',
      phosphorGlowIntensity: 0,
      phosphorGlowSpread: 0,

      // CRT frame - disabled for cyberpunk
      enableCRTFrame: false,
      crtFrameRadius: 0.85,
      crtFrameSoftness: 0.02,

      enableHolographicShader: true,
      cardGlowColor: '#00f5ff',
      cardScanlineIntensity: 0.08,
      cardShimmerIntensity: 0.15,
      cardEdgeGlow: 0.3,

      shelfColor: '#00f5ff',
      shelfEmissiveIntensity: 0.3,
    },

    scrollbarTrack: '#1a1025',
    scrollbarThumb: '#00f5ff',
    scrollbarThumbHover: '#ff00ff',
  },

  minimal: {
    // Base colors - steel grey
    background: '#1a1c1e',
    backgroundSecondary: '#252729',
    surface: 'rgba(200, 205, 210, 0.06)',
    surfaceHover: 'rgba(200, 205, 210, 0.12)',
    border: 'rgba(200, 205, 210, 0.12)',
    borderHover: 'rgba(200, 205, 210, 0.2)',

    // Text colors
    textPrimary: '#e8eaec',
    textSecondary: '#9ba0a5',
    textMuted: '#5c6166',

    // Accent colors - warm brown/tan
    accent: '#c4a574',
    accentHover: '#d4b584',
    accentMuted: 'rgba(196, 165, 116, 0.2)',
    accentSecondary: '#a89070',

    // 3D Scene settings - clean, no effects
    scene: {
      backgroundColor: '#1a1c1e',
      primaryLightColor: '#f5e6d3',
      secondaryLightColor: '#c4a574',
      accentLightColor: '#8b7355',
      showGrid: false,
      gridColor: '#3d3f42',
      gridSecondaryColor: '#2a2c2e',
      showParticles: false,
      particleColor: '#c4a574',

      enableBloom: false,
      bloomIntensity: 0,
      bloomThreshold: 1,
      enableChromaticAberration: false,
      chromaticAberrationOffset: 0,
      enableVignette: true,
      vignetteDarkness: 0.3,
      enableNoise: false,
      noiseOpacity: 0,

      // CRT effects - disabled for minimal
      enableBarrelDistortion: false,
      barrelDistortion: 0,
      barrelDistortionScale: 1,

      // Phosphor glow - disabled for minimal
      enablePhosphorGlow: false,
      phosphorGlowColor: '#c4a574',
      phosphorGlowIntensity: 0,
      phosphorGlowSpread: 0,

      // CRT frame - disabled for minimal
      enableCRTFrame: false,
      crtFrameRadius: 0.85,
      crtFrameSoftness: 0.02,

      enableHolographicShader: false,
      cardGlowColor: '#c4a574',
      cardScanlineIntensity: 0,
      cardShimmerIntensity: 0,
      cardEdgeGlow: 0,

      shelfColor: '#3d3f42',
      shelfEmissiveIntensity: 0.05,
    },

    scrollbarTrack: '#252729',
    scrollbarThumb: '#c4a574',
    scrollbarThumbHover: '#d4b584',
  },

  'retro-crt': {
    // Base colors - deep blacks with amber/green tint
    background: '#0a0a08',
    backgroundSecondary: '#151510',
    surface: 'rgba(255, 200, 100, 0.05)',
    surfaceHover: 'rgba(255, 200, 100, 0.1)',
    border: 'rgba(255, 150, 50, 0.2)',
    borderHover: 'rgba(255, 150, 50, 0.3)',

    // Text colors
    textPrimary: '#ffcc66',
    textSecondary: '#cc9933',
    textMuted: '#665522',

    // Accent colors - amber/orange CRT phosphor
    accent: '#ff6b35',
    accentHover: '#ff8855',
    accentMuted: 'rgba(255, 107, 53, 0.2)',
    accentSecondary: '#ffaa00',

    // 3D Scene settings - CRT aesthetic (to be implemented later)
    scene: {
      backgroundColor: '#0a0a08',
      primaryLightColor: '#ff6b35',
      secondaryLightColor: '#ffaa00',
      accentLightColor: '#ff4400',
      showGrid: true,
      gridColor: '#ff6b35',
      gridSecondaryColor: '#aa4420',
      showParticles: true,
      particleColor: '#ff6b35',

      enableBloom: true,
      bloomIntensity: 0.8,
      bloomThreshold: 0.5,
      enableChromaticAberration: true,
      chromaticAberrationOffset: 0.002,
      enableVignette: false,
      vignetteDarkness: 0,
      enableNoise: true,
      noiseOpacity: 0.05,

      // CRT effects - enabled for retro-crt theme
      enableBarrelDistortion: true,
      barrelDistortion: 0.35,
      barrelDistortionScale: 0.65,

      // Phosphor glow - amber/orange for retro-crt
      enablePhosphorGlow: true,
      phosphorGlowColor: '#ff6b35',
      phosphorGlowIntensity: 0.4,
      phosphorGlowSpread: 8,

      // CRT frame - hard stop to catch any bleeding past barrel distortion
      enableCRTFrame: true,
      crtFrameRadius: 1.0,
      crtFrameSoftness: 0.01,

      enableHolographicShader: true,
      cardGlowColor: '#ff6b35',
      cardScanlineIntensity: 0.15,
      cardShimmerIntensity: 0.05,
      cardEdgeGlow: 0.2,

      shelfColor: '#ff6b35',
      shelfEmissiveIntensity: 0.2,
    },

    scrollbarTrack: '#151510',
    scrollbarThumb: '#ff6b35',
    scrollbarThumbHover: '#ffaa00',
  },

  'retro-terminal': {
    // Base colors - deep blacks with green phosphor tint (Matrix/Fallout style)
    background: '#0a0c0a',
    backgroundSecondary: '#101510',
    surface: 'rgba(0, 255, 100, 0.05)',
    surfaceHover: 'rgba(0, 255, 100, 0.1)',
    border: 'rgba(0, 255, 100, 0.2)',
    borderHover: 'rgba(0, 255, 100, 0.3)',

    // Text colors - green phosphor glow
    textPrimary: '#33ff66',
    textSecondary: '#22cc44',
    textMuted: '#116622',

    // Accent colors - bright terminal green
    accent: '#00ff41',
    accentHover: '#33ff66',
    accentMuted: 'rgba(0, 255, 65, 0.2)',
    accentSecondary: '#00cc33',

    // 3D Scene settings - green phosphor CRT aesthetic
    scene: {
      backgroundColor: '#0a0c0a',
      primaryLightColor: '#00ff41',
      secondaryLightColor: '#00cc33',
      accentLightColor: '#33ff66',
      showGrid: true,
      gridColor: '#00ff41',
      gridSecondaryColor: '#006622',
      showParticles: true,
      particleColor: '#00ff41',

      enableBloom: true,
      bloomIntensity: 0.9,
      bloomThreshold: 0.4,
      enableChromaticAberration: true,
      chromaticAberrationOffset: 0.0015,
      enableVignette: false,
      vignetteDarkness: 0,
      enableNoise: true,
      noiseOpacity: 0.06,

      // CRT effects - enabled for retro-terminal theme
      enableBarrelDistortion: true,
      barrelDistortion: 0.35,
      barrelDistortionScale: 0.65,

      // Phosphor glow - green for terminal
      enablePhosphorGlow: true,
      phosphorGlowColor: '#00ff41',
      phosphorGlowIntensity: 0.45,
      phosphorGlowSpread: 10,

      // CRT frame - hard stop to catch any bleeding past barrel distortion
      enableCRTFrame: true,
      crtFrameRadius: 1.0,
      crtFrameSoftness: 0.01,

      enableHolographicShader: true,
      cardGlowColor: '#00ff41',
      cardScanlineIntensity: 0.15,
      cardShimmerIntensity: 0.05,
      cardEdgeGlow: 0.25,

      shelfColor: '#00ff41',
      shelfEmissiveIntensity: 0.25,
    },

    scrollbarTrack: '#101510',
    scrollbarThumb: '#00ff41',
    scrollbarThumbHover: '#33ff66',
  },
};

/**
 * Get the theme configuration for a given theme mode
 */
export function getThemeConfig(theme: ThemeMode): ThemeConfig {
  return themes[theme] || themes.cyberpunk;
}
