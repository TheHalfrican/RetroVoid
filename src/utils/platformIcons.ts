/**
 * Platform ID to icon filename mapping
 * Logos from Dan Patrick's Platform Logo Collection v2.1 (Light - Color)
 */

// Map platform IDs to their icon filenames
export const platformIconMap: Record<string, string> = {
  // Nintendo Home Consoles
  nes: 'Nintendo Entertainment System.png',
  snes: 'Super Nintendo Entertainment System.png',
  n64: 'Nintendo 64.png',
  gamecube: 'Nintendo GameCube.png',
  wii: 'Nintendo Wii.png',
  switch: 'Nintendo Switch.png',
  virtualboy: 'Nintendo Virtual Boy.png',

  // Nintendo Handhelds
  gb: 'Nintendo Game Boy.png',
  gbc: 'Nintendo Game Boy Color.png',
  gba: 'Nintendo Game Boy Advance.png',
  nds: 'Nintendo DS.png',
  '3ds': 'Nintendo 3DS.png',

  // Sony
  ps1: 'Sony Playstation.png',
  ps2: 'Sony Playstation 2.png',
  ps3: 'Sony Playstation 3.png',
  psp: 'Sony PSP.png',
  vita: 'Sony PS Vita.png',

  // Sega
  genesis: 'Sega Genesis.png',
  saturn: 'Sega Saturn.png',
  dreamcast: 'Sega Dreamcast.png',
  mastersystem: 'Sega Master System.png',
  gamegear: 'Sega Game Gear.png',

  // Microsoft
  xbox: 'Microsoft Xbox.png',
  xbox360: 'Microsoft Xbox 360.png',
  windows: 'Microsoft Windows.png',

  // Atari
  atari2600: 'Atari 2600.png',
  atari5200: 'Atari 5200.png',
  atari7800: 'Atari 7800.png',
  atarijaguar: 'Atari Jaguar.png',

  // Other
  '3do': '3DO Interactive Multiplayer.png',
  arcade: 'MAME.png',
  dos: 'MS-DOS.png',
  scummvm: 'ScummVM.png',
  neogeo: 'SNK Neo Geo.png',
  pcengine: 'NEC TurboGrafx-16.png',
};

/**
 * Get the icon filename for a platform ID
 * @param platformId - The platform ID (e.g., 'nes', 'ps1')
 * @returns The icon filename or undefined if not found
 */
export function getPlatformIconFilename(platformId: string): string | undefined {
  return platformIconMap[platformId];
}

/**
 * Get the full import path for a platform icon
 * Icons are stored in src/assets/platforms/
 * @param platformId - The platform ID
 * @returns The import path or undefined if not found
 */
export function getPlatformIconPath(platformId: string): string | undefined {
  const filename = platformIconMap[platformId];
  if (!filename) return undefined;
  return `/src/assets/platforms/${filename}`;
}
