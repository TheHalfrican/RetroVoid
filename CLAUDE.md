# RetroVoid

A premium emulator launcher with holographic 3D visuals and cyberpunk aesthetics. Built with Tauri, React, and Three.js.

## Tech Stack

- **Framework**: Tauri 2.x (Rust backend + React frontend)
- **3D Graphics**: React Three Fiber + Drei + postprocessing
- **Styling**: Tailwind CSS + Framer Motion
- **State**: Zustand with persist middleware
- **Database**: SQLite via rusqlite (Rust)

## Project Structure

```
src/
├── components/
│   ├── three/          # 3D components (R3F)
│   │   ├── CyberpunkEnvironment.tsx  # Post-processing wrapper
│   │   ├── NeonGrid.tsx              # Animated floor grid
│   │   ├── ParticleField.tsx         # Floating particles
│   │   ├── GameCard3D.tsx            # Holographic game cards
│   │   ├── HolographicShelf.tsx      # 3D shelf layout
│   │   └── RotatingStars.tsx         # Background stars
│   ├── ui/             # 2D UI components
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   ├── GameCard.tsx
│   │   ├── GameGrid.tsx
│   │   ├── GameDetail.tsx
│   │   ├── MetadataEditorModal.tsx
│   │   ├── FullSettingsWindow.tsx
│   │   └── HolographicShelfView.tsx
│   └── layout/
│       └── MainLayout.tsx
├── stores/             # Zustand stores
│   ├── useLibraryStore.ts
│   ├── useUIStore.ts
│   └── useSettingsStore.ts
├── services/           # Tauri IPC wrappers
│   ├── library.ts
│   ├── emulator.ts
│   └── scraper.ts
└── types/index.ts

src-tauri/src/
├── main.rs
├── lib.rs              # App state, plugin registration
├── db.rs               # SQLite wrapper, CRUD operations
├── models.rs           # Rust data models
├── commands/mod.rs     # All Tauri commands
└── scraper/
    ├── mod.rs
    └── igdb.rs         # IGDB API client
```

## Design System

### Colors
```css
--void-black: #0a0a0f;
--deep-purple: #1a1025;
--midnight-blue: #0d1b2a;
--neon-cyan: #00f5ff;
--neon-magenta: #ff00ff;
--neon-orange: #ff6b35;
--electric-blue: #4d7cff;
```

### Typography
- **Display**: Orbitron (techy, geometric)
- **Body**: JetBrains Mono (readable, futuristic)

## Data Models

```typescript
interface Game {
  id: string;
  title: string;
  romPath: string;
  platformId: string;
  coverArtPath?: string;
  description?: string;
  releaseDate?: string;
  genre?: string[];
  developer?: string;
  publisher?: string;
  totalPlayTimeSeconds: number;
  lastPlayed?: string;
  isFavorite: boolean;
  preferredEmulatorId?: string;
}

interface Emulator {
  id: string;
  name: string;
  executablePath: string;
  launchArguments: string;  // Supports {rom}, {title} placeholders
  supportedPlatformIds: string[];
}

interface Platform {
  id: string;              // e.g., "nes", "snes", "ps1"
  displayName: string;
  manufacturer: string;
  fileExtensions: string[];
  defaultEmulatorId?: string;
  color: string;
}
```

## Key Patterns

### Tauri IPC
```typescript
// Frontend: src/services/library.ts
import { invoke } from '@tauri-apps/api/core';
export async function getAllGames(): Promise<Game[]> {
  return invoke('get_all_games');
}

// Backend: src-tauri/src/commands/mod.rs
#[tauri::command]
pub async fn get_all_games(state: State<'_, AppState>) -> Result<Vec<Game>, String> {
    state.db.get_all_games().map_err(|e| e.to_string())
}
```

### Asset Protocol (Local Images in Webview)
```typescript
import { convertFileSrc } from '@tauri-apps/api/core';
// Convert file path to asset:// URL for display
const imageUrl = convertFileSrc(game.coverArtPath);
```

### Custom Shader Material (R3F)
```typescript
const HologramMaterial = shaderMaterial(
  { uTime: 0, uTexture: null, uHoverIntensity: 0 },
  vertexShader,
  fragmentShader
);
extend({ HologramMaterial });
// Use with: <hologramMaterial ref={materialRef} />
```

## Implemented Features

### Core
- [x] SQLite database with 30 pre-configured platforms
- [x] Game library scanning (recursive ROM detection)
- [x] Multi-disc game support (auto-generates .m3u playlists)
- [x] Emulator configuration with launch arguments
- [x] RetroArch core auto-detection
- [x] IGDB metadata scraping (cover art, descriptions)
- [x] Play time tracking
- [x] Favorites system

### UI Views
- [x] Grid view - Responsive card layout with hover effects
- [x] List view - Compact table layout
- [x] 3D Shelf view - Holographic cards on neon shelves

### 3D Visual System
- [x] CyberpunkEnvironment - Post-processing (Bloom, ChromaticAberration, Vignette, Noise)
- [x] NeonGrid - Animated scrolling grid floor with GLSL shader
- [x] ParticleField - Floating digital dust particles
- [x] GameCard3D - Holographic cards with scanlines/shimmer shader
- [x] HolographicShelf - 3D game arrangement on glowing platforms
- [x] RotatingStars - Slowly rotating starfield background

### Settings
- [x] Native folder picker for ROM scanning
- [x] Emulator management (add/edit/delete)
- [x] Platform default emulator assignment
- [x] IGDB API credentials configuration
- [x] Visual effects toggles (particles, 3D effects)

## Important Notes

### Image Display in Tauri
Cover art is saved to `<app_data>/images/covers/{game_id}.jpg`. Must use `convertFileSrc()` to display in webview - raw `file://` URLs are blocked.

### 3D Shelf Post-Processing
HolographicShelfView uses reduced bloom settings to prevent cover art from being washed out:
```typescript
<CyberpunkEnvironment
  bloomIntensity={0.6}
  bloomThreshold={0.7}
  chromaticAberrationOffset={0.0005}
>
```

### Serde Serialization
Rust structs returned to frontend need `#[serde(rename_all = "camelCase")]` to match TypeScript conventions.

### Canvas Configuration
Main 3D scene uses `dpr={1}` (fixed) and `fixed` positioning with `z-0`. UI backgrounds are semi-transparent to show 3D scene behind.

## Next Steps
- Mouse wheel scrolling for large libraries in 3D shelf view
- Keyboard navigation support
- Camera fly-in animation when selecting games

## Tauri Plugins Used
- `tauri-plugin-dialog` - Native file/folder pickers
- `tauri-plugin-fs` - Asset protocol for local images
- SQLite via `rusqlite` (not Tauri SQL plugin)

## IGDB Integration
Requires Twitch Developer credentials (https://dev.twitch.tv/console). Platform ID mapping in `src-tauri/src/scraper/igdb.rs`. Images downloaded to app data directory.

---

## Development Log

### Session - January 14, 2026

**3D Visual System:**
- Added 3D background and effects to main page (CyberpunkEnvironment, NeonGrid, ParticleField)
- Added rotation effect to the starfield background
- Added Holographic Shelf view - full 3D game browsing with games on glowing neon platforms
- Added parallax tilt effect to game cards in Holographic Shelf view
- Added horizontal scrolling per shelf with floating platform logos above each shelf
- Added drag-and-rubberband effect to 3D game cards and platform logos

**UI Enhancements:**
- Added high quality console/platform logos to all views (Grid, List, 3D Shelf, Game Cards)
- Fixed logo aspect ratio detection on game cards and holographic shelf
- Darkened rows in list view for better visibility against the 3D grid
- Added slider for adjusting game card size in grid view
- Added parallax tilt and drag-rubberband effect to Game Detail cover art
- Constrained cover art sizing for consistent display regardless of resolution
- Added bulk select in grid view (shift+click to select, right-click for bulk actions)
- Bulk actions: mass delete and batch IGDB metadata fetch with progress indicator
- Fixed text selection highlight when shift+clicking to multi-select games (added select-none)
- Fixed platform picker modal cutting off at bottom of screen (now uses edge-anchored positioning)
- Added "Recently Added" section to sidebar showing 25 most recently added games

**Library Management:**
- Added manual IGDB search per game (in case auto-scrape gets wrong match)
- Fixed .bin files from importing alongside .cue files (PS1 bin/cue pairs)
- Fixed .bin/.cue detection on Windows (case-insensitive extension matching, directory-based check)
- Fixed ROM path resolution on Windows (canonicalize paths during scan and launch, escape backslashes for shell parsing)
- Added stricter import rules for ROM scanning
- Added custom cover art upload - users can add their own higher resolution art
- Added live progress log during batch metadata scraping (shows each game as it's fetched)
- Improved IGDB scraping accuracy: filters by platform, prioritizes exact matches and original releases
- Added multi-disc game support: auto-generates .m3u playlist files for games with multiple discs (e.g., FF7, Galerians)
- Added metadata editor modal for editing game title, description, release date, developer, publisher, and genres (tag chips)
- Added right-click context menu on single games with "Set Custom Cover Art..." and "Edit Metadata..." options
- Added Edit Metadata button to Game Detail view
- Games with custom metadata are now skipped during "Fetch Missing Metadata" batch operations
- Added auto-scan on app launch: automatically scans all configured library folders when RetroVoid starts
- Added `createdAt` timestamp to track when games are added to library
- Added platform detection hints for 3DO, Atari Jaguar, and Virtual Boy to prevent mis-assignment
- Added 3DO, Atari Jaguar, and Virtual Boy platform icons
- Added Panasonic to sidebar manufacturer list (for 3DO)

**Project:**
- Renamed project from "The Emulation Station" to "RetroVoid"

### Session - January 15, 2026

**Library Management:**
- Fixed user-set folder platform being ignored during import (added missing serde rename_all to ScanPath struct)
- Added platform priority system for shared file extensions (.iso, .chd) - prevents 3DO from stealing PS2 games during auto-detect
- Updated Dreamcast extensions to use .cue instead of .gdi (avoids duplicate imports when both exist)
- Added .stfs file support for Xbox 360
- Added .wad file support for Wii (WiiWare/Virtual Console titles)
- Strip .nkit suffix from game titles during import (e.g., "Game.nkit.iso" now imports as "Game")
- Added PS3 directory-based game detection for RPCS3 (detects PS3_DISC.SFB in game folders)
- Removed .pkg from PS3 auto-import (ambiguous - could be games, DLC, or updates); use Manual Import instead
- Removed .nsp/.xci from Switch auto-import (ambiguous - could be games, DLC, or updates); use Manual Import instead
- Added Windows platform for modern PC games (manual import only, direct launch without emulator)

**Performance:**
- Added batch delete for games (single database transaction instead of per-game deletes)

**UI Enhancements:**
- Added Manual Import tab in Settings for games that can't be auto-detected (PS3 .pkg, Windows .exe, Switch .nsp/.xci)
- Manual Import validates file extensions against selected platform
- Platforms with no extensions (PS3, Windows) accept any file type via manual import
- Added editable Game Title field to Manual Import (auto-fills from filename)
- Added Windows platform icon in sidebar
- Added launch arguments reference table in Emulators settings (PCSX2, DuckStation, RPCS3, Dolphin, etc.)
- Added PS3 PKG workflow instructions in Manual Import tab (guides users to point to installed EBOOT.BIN)
- Added Switch games note in Manual Import tab (clarifies that .nsp/.xci files launch directly, unlike PS3 PKGs)

**Launch Fixes:**
- PS3 games now correctly launch by converting PS3_DISC.SFB path to EBOOT.BIN path for RPCS3

**Settings & Metadata:**
- Batch metadata scraping now runs in background and persists across navigation (moved state to global store)
- Progress log remains visible when returning to Metadata settings tab during scraping
- Added cancel button for in-progress batch scraping
