# The Emulation Station

A premium emulator launcher with holographic 3D visuals and cyberpunk aesthetics. Built with Tauri, React, and Three.js for a cutting-edge, cross-platform experience.

## Tech Stack

- **Desktop Framework**: Tauri 2.x (Rust backend, web frontend)
- **Frontend**: React 18 + TypeScript
- **3D/Graphics**: Three.js via React Three Fiber (R3F) + Drei helpers
- **Styling**: Tailwind CSS + Framer Motion
- **State**: Zustand with persist middleware
- **Data**: SQLite via Tauri's SQL plugin
- **Build**: Vite
- **Dev Environment**: Docker containerized

## Project Structure

```
the-emulation-station/
├── docker/
│   ├── Dockerfile.dev          # Development container
│   ├── Dockerfile.build        # Production build container
│   └── docker-compose.yml      # Orchestration
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # Tauri entry point
│   │   ├── commands/           # IPC command handlers
│   │   ├── emulator.rs         # Launch logic
│   │   └── library.rs          # Game scanning, metadata
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── main.tsx                # React entry
│   ├── App.tsx                 # Root component + routing
│   ├── components/
│   │   ├── three/              # R3F 3D components
│   │   │   ├── GameCard3D.tsx
│   │   │   ├── HolographicShelf.tsx
│   │   │   ├── NeonGrid.tsx
│   │   │   ├── ParticleField.tsx
│   │   │   └── CyberpunkEnvironment.tsx
│   │   ├── ui/                 # 2D UI components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── GameDetail.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   └── SettingsPanel.tsx
│   │   └── layout/
│   ├── stores/                 # Zustand stores
│   │   ├── useLibraryStore.ts
│   │   ├── useUIStore.ts
│   │   └── useSettingsStore.ts
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # Tauri IPC wrappers
│   ├── types/                  # TypeScript interfaces
│   ├── shaders/                # Custom GLSL shaders
│   │   ├── hologram.frag
│   │   ├── neonGlow.frag
│   │   └── crtDistortion.frag
│   └── assets/
│       ├── fonts/
│       ├── textures/
│       └── models/
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Visual Design System

### Aesthetic Direction: Holographic Cyberpunk

Blend of floating holographic 3D elements with neon-soaked cyberpunk atmosphere. Think sci-fi command center meets arcade.

### Color Palette

```css
:root {
  /* Base */
  --void-black: #0a0a0f;
  --deep-purple: #1a1025;
  --midnight-blue: #0d1b2a;
  
  /* Neon Accents */
  --neon-cyan: #00f5ff;
  --neon-magenta: #ff00ff;
  --neon-orange: #ff6b35;
  --electric-blue: #4d7cff;
  
  /* Holographic */
  --holo-gradient: linear-gradient(135deg, #00f5ff33, #ff00ff33, #ffff0033);
  --glass-white: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
}
```

### Typography

- **Display**: "Orbitron" or "Audiowide" - techy, geometric
- **Body**: "JetBrains Mono" or "Space Mono" - readable, futuristic
- **Accent**: "Bebas Neue" - bold headers, UI labels

Import via Google Fonts or self-host in `src/assets/fonts/`.

### Visual Effects Checklist

#### 3D Elements (React Three Fiber)
- **Holographic game cards**: Floating cards with iridescent shader, subtle rotation on hover
- **Neon grid floor**: Infinite grid with glow, perspective depth
- **Particle field**: Floating dust/data particles in background
- **3D platform shelves**: Optional view mode with games on glowing shelves
- **Camera transitions**: Smooth fly-through when selecting games

#### 2.5D Effects
- **Parallax layers**: Mouse-tracked depth on UI elements
- **3D card tilt**: `react-tilt` or custom transform on game covers
- **Depth-of-field**: Blur distant elements when focusing on game detail
- **Reflection planes**: Subtle mirror effect under featured content

#### Shader Effects
- **Hologram flicker**: Scanlines + chromatic aberration + occasional glitch
- **Neon glow**: Bloom post-processing on accent colors
- **CRT curvature**: Optional retro display mode
- **Edge glow**: Fresnel-based rim lighting on 3D objects

#### Framer Motion (2D UI)
- **Staggered reveals**: List items animate in sequence
- **Morphing transitions**: Smooth layout changes between views
- **Magnetic buttons**: Subtle pull toward cursor on hover
- **Glitch text**: Random character scramble on hover

### Component Visual Specs

#### Game Card (3D Mode)
```
┌─────────────────────────┐
│ ┌─────────────────────┐ │  - Floating in 3D space
│ │                     │ │  - Holographic edge glow
│ │     Cover Art       │ │  - Rotates toward camera on hover
│ │                     │ │  - Scanline overlay shader
│ │                     │ │  - Platform icon badge (corner)
│ └─────────────────────┘ │
│   Game Title            │  - Neon text glow
│   Platform • Play Time  │  - Subtle reflection below
└─────────────────────────┘
```

#### Main View Layout
```
┌──────────────────────────────────────────────────────────┐
│ ▀▀▀ THE EMULATION STATION ▀▀▀              🔍  ⚙️  ─ □ × │
├────────────┬─────────────────────────────────────────────┤
│            │  ┌─────────────────────────────────────┐    │
│  PLATFORMS │  │         FEATURED GAME               │    │
│  ──────────│  │     (Full 3D hero section)         │    │
│  Nintendo  │  │      Particles + Backdrop          │    │
│  Sony      │  └─────────────────────────────────────┘    │
│  Sega      │                                             │
│  Arcade    │  ╭─────╮ ╭─────╮ ╭─────╮ ╭─────╮ ╭─────╮   │
│  PC        │  │     │ │     │ │     │ │     │ │     │   │
│            │  │ 3D  │ │Card │ │Grid │ │Hover│ │Glow │   │
│  COLLECTIONS  │     │ │     │ │     │ │     │ │     │   │
│  ──────────│  ╰─────╯ ╰─────╯ ╰─────╯ ╰─────╯ ╰─────╯   │
│  Favorites │        ▲ Neon grid floor reflection ▲       │
│  Recent    │                                             │
└────────────┴─────────────────────────────────────────────┘
```

#### Game Detail View
- Background: Blurred screenshot/artwork with gradient overlay
- 3D floating cover art with hologram shader
- Metadata panel with glassmorphism
- Large "LAUNCH" button with pulse animation and glow
- Screenshot carousel with 3D depth

## Core Features

### Emulator Management
- Add/configure emulators with executable paths and arguments
- Per-platform default emulator assignment
- Per-game emulator override
- Automatic emulator detection (scan common install paths)
- Launch argument templates with `{rom}`, `{title}` placeholders

### Game Library
- Folder scanning with recursive ROM detection
- Metadata scraping (IGDB, ScreenScraper, or custom)
- Cover art, screenshots, descriptions, release dates
- Custom collections and favorites
- Play time tracking (monitor process lifetime)
- Filters: platform, genre, year, completion status, recently played
- Search with fuzzy matching

### Supported Platforms

| Platform | Extensions | Common Emulators |
|----------|-----------|------------------|
| NES | .nes, .unf | Mesen, FCEUX, RetroArch |
| SNES | .sfc, .smc | bsnes, Snes9x, RetroArch |
| N64 | .n64, .z64, .v64 | Project64, Mupen64Plus, RetroArch |
| GameCube | .iso, .gcz, .rvz | Dolphin |
| Wii | .iso, .wbfs, .rvz | Dolphin |
| Switch | .nsp, .xci | Ryujinx, Yuzu |
| GB/GBC | .gb, .gbc | SameBoy, Gambatte, RetroArch |
| GBA | .gba | mGBA, RetroArch |
| DS | .nds | melonDS, DeSmuME |
| 3DS | .3ds, .cia | Citra |
| PS1 | .bin, .cue, .chd | DuckStation, RetroArch |
| PS2 | .iso, .chd | PCSX2 |
| PS3 | folder, .pkg | RPCS3 |
| PSP | .iso, .cso | PPSSPP |
| Vita | .vpk | Vita3K |
| Genesis | .md, .gen, .bin | BlastEm, Kega Fusion, RetroArch |
| Saturn | .iso, .cue, .chd | Mednafen, Kronos |
| Dreamcast | .gdi, .cdi, .chd | Flycast, Redream |
| Xbox | .iso | xemu |
| Xbox 360 | .iso, folder | Xenia |
| Arcade | .zip | MAME, FBNeo |
| DOS | folder | DOSBox, DOSBox-X |
| ScummVM | folder | ScummVM |

### Launch Flow
1. User clicks game or presses launch button
2. Resolve emulator: game override → platform default → prompt user
3. Build command with configured arguments
4. Invoke Tauri command to spawn process
5. Track process start time
6. On exit: calculate session duration, update play time, log session

## Data Models

```typescript
interface Game {
  id: string;                    // UUID
  title: string;
  romPath: string;
  platformId: string;
  coverArtPath?: string;
  backgroundPath?: string;
  screenshots?: string[];
  description?: string;
  releaseDate?: string;          // ISO date
  genre?: string[];
  developer?: string;
  publisher?: string;
  totalPlayTimeSeconds: number;
  lastPlayed?: string;           // ISO datetime
  isFavorite: boolean;
  preferredEmulatorId?: string;
  collectionIds: string[];
}

interface Emulator {
  id: string;
  name: string;
  executablePath: string;
  launchArguments: string;       // e.g., "--fullscreen {rom}"
  supportedPlatformIds: string[];
}

interface Platform {
  id: string;                    // e.g., "nes", "ps1"
  displayName: string;
  manufacturer: string;          // "Nintendo", "Sony", etc.
  fileExtensions: string[];
  iconPath?: string;
  defaultEmulatorId?: string;
  color: string;                 // Accent color for UI theming
}

interface Collection {
  id: string;
  name: string;
  gameIds: string[];
  coverGameId?: string;          // Game whose art represents collection
}

interface PlaySession {
  id: string;
  gameId: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}
```

## Zustand Store Structure

```typescript
// useLibraryStore.ts
interface LibraryState {
  games: Game[];
  platforms: Platform[];
  emulators: Emulator[];
  collections: Collection[];
  
  // Actions
  loadLibrary: () => Promise<void>;
  addGame: (game: Game) => void;
  updateGame: (id: string, updates: Partial<Game>) => void;
  deleteGame: (id: string) => void;
  toggleFavorite: (id: string) => void;
}

// useUIStore.ts
interface UIState {
  selectedGameId: string | null;
  selectedPlatformId: string | null;
  viewMode: 'grid' | 'list' | '3d-shelf';
  searchQuery: string;
  sidebarCollapsed: boolean;
  settingsPanelOpen: boolean;
  
  // Actions
  selectGame: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
}

// useSettingsStore.ts - persisted to disk
interface SettingsState {
  theme: 'cyberpunk' | 'minimal' | 'retro-crt';
  enableScanlines: boolean;
  enableParticles: boolean;
  enable3DEffects: boolean;
  libraryPaths: string[];
  
  // Actions
  updateSettings: (updates: Partial<SettingsState>) => void;
}
```

## Docker Development Setup

### docker-compose.yml
```yaml
version: '3.8'
services:
  dev:
    build:
      context: .
      dockerfile: docker/Dockerfile.dev
    volumes:
      - .:/app
      - /app/node_modules
      - /app/src-tauri/target
      - /tmp/.X11-unix:/tmp/.X11-unix  # Linux GUI passthrough
    environment:
      - DISPLAY=${DISPLAY}
      - CARGO_HOME=/app/.cargo
    ports:
      - "1420:1420"   # Vite dev server
      - "6080:6080"   # noVNC (optional, for headless)
    network_mode: host  # Required for Tauri on Linux
    working_dir: /app
    command: pnpm tauri dev
```

### Dockerfile.dev
```dockerfile
FROM rust:1.75-bookworm

# Install system dependencies for Tauri
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.1-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install Tauri CLI
RUN cargo install tauri-cli

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files first for layer caching
COPY package.json pnpm-lock.yaml ./
RUN pnpm install

# Copy Cargo files for layer caching
COPY src-tauri/Cargo.toml src-tauri/Cargo.lock ./src-tauri/
RUN mkdir -p src-tauri/src && echo "fn main() {}" > src-tauri/src/main.rs
RUN cd src-tauri && cargo fetch

COPY . .

EXPOSE 1420

CMD ["pnpm", "tauri", "dev"]
```

### Platform-Specific Notes

**macOS/Windows**: Docker GUI passthrough is complex. Options:
1. Run Tauri outside container, only containerize builds
2. Use WSL2 on Windows with X server (VcXsrv)
3. Use OrbStack on macOS for better Linux GUI support

**Linux**: Works natively with X11 socket passthrough

For cross-platform dev, consider containerizing only the build/CI pipeline and running dev locally.

## Code Conventions

### TypeScript
- Strict mode enabled
- Use `interface` for object shapes, `type` for unions/aliases
- Prefer `const` assertions for literals
- Explicit return types on exported functions

### React
- Functional components only
- Custom hooks for reusable logic (prefix with `use`)
- Memoize expensive computations with `useMemo`
- Use `React.lazy` for route-level code splitting

### React Three Fiber
- Components in `components/three/` directory
- Use Drei helpers liberally (Float, MeshDistortMaterial, etc.)
- Dispose geometries/materials in cleanup
- Use `useFrame` sparingly, prefer declarative animations

### Tauri IPC
```typescript
// services/emulator.ts
import { invoke } from '@tauri-apps/api/core';

export async function launchGame(gameId: string): Promise<void> {
  return invoke('launch_game', { gameId });
}

// src-tauri/src/commands/mod.rs
#[tauri::command]
async fn launch_game(game_id: String, state: State<'_, AppState>) -> Result<(), String> {
    // Launch logic
}
```

### Styling
- Tailwind for utility classes
- CSS variables for theme values
- Framer Motion for animations (not CSS transitions for complex sequences)
- `clsx` or `cn` helper for conditional classes

## Performance Guidelines

- Virtualize game grid with `@tanstack/react-virtual`
- Lazy load images with intersection observer
- Use `Suspense` boundaries around 3D scenes
- Limit Three.js render loop when tab unfocused
- Cache metadata in SQLite, not memory
- Debounce search input (300ms)
- Use `startTransition` for non-urgent state updates

## Recommended Packages

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.88.0",
    "@react-three/postprocessing": "^2.15.0",
    "three": "^0.160.0",
    "framer-motion": "^10.16.0",
    "zustand": "^4.4.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-virtual": "^3.0.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "vite": "^5.0.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

## Key Implementation Notes

### Three.js Scene Setup
```tsx
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';

function GameLibraryScene() {
  return (
    <Canvas camera={{ position: [0, 2, 10], fov: 50 }}>
      <color attach="background" args={['#0a0a0f']} />
      <fog attach="fog" args={['#0a0a0f', 10, 50]} />
      
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} color="#00f5ff" intensity={1} />
      
      <NeonGrid />
      <ParticleField />
      <GameCards />
      
      <EffectComposer>
        <Bloom luminanceThreshold={0.2} intensity={1.5} />
        <ChromaticAberration offset={[0.002, 0.002]} />
      </EffectComposer>
    </Canvas>
  );
}
```

### Holographic Shader (simplified)
```glsl
// shaders/hologram.frag
varying vec2 vUv;
uniform float time;
uniform sampler2D coverTexture;

void main() {
  vec4 color = texture2D(coverTexture, vUv);
  
  // Scanlines
  float scanline = sin(vUv.y * 300.0 + time * 5.0) * 0.04;
  color.rgb += scanline;
  
  // Holographic shimmer
  float shimmer = sin(vUv.x * 10.0 + vUv.y * 10.0 + time * 2.0) * 0.1;
  color.rgb += vec3(shimmer * 0.5, shimmer, shimmer * 0.8);
  
  // Edge glow (fresnel approximation)
  float edge = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 3.0);
  color.rgb += vec3(0.0, edge * 0.3, edge * 0.4);
  
  gl_FragColor = color;
}
```

### Tauri Commands Pattern
```rust
// src-tauri/src/commands/library.rs
use tauri::State;
use crate::state::AppState;

#[tauri::command]
pub async fn scan_library(
    paths: Vec<String>,
    state: State<'_, AppState>,
) -> Result<Vec<Game>, String> {
    let mut games = Vec::new();
    for path in paths {
        games.extend(scan_directory(&path, &state).await?);
    }
    Ok(games)
}

#[tauri::command]
pub async fn launch_game(
    game_id: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let game = state.get_game(&game_id)?;
    let emulator = state.resolve_emulator(&game)?;
    
    let args = emulator.launch_arguments
        .replace("{rom}", &game.rom_path)
        .replace("{title}", &game.title);
    
    std::process::Command::new(&emulator.executable_path)
        .args(args.split_whitespace())
        .spawn()
        .map_err(|e| e.to_string())?;
    
    state.start_play_session(&game_id)?;
    Ok(())
}
```

---

## Development Log

### Session 1 - January 13, 2026: Project Scaffolding

**Completed:**
- Installed Rust toolchain (cargo 1.92.0, rustc 1.92.0)
- Created Tauri 2.x + React + TypeScript project
- Installed all dependencies:
  - Runtime: @react-three/fiber, @react-three/drei, @react-three/postprocessing, three, framer-motion, zustand, react-router-dom, @tanstack/react-virtual, clsx, tailwind-merge
  - Dev: tailwindcss@3, postcss, autoprefixer, @types/three
- Configured Tailwind CSS with cyberpunk theme colors, fonts, and custom utilities
- Created project folder structure per spec
- Set up base files:
  - `src/types/index.ts` - TypeScript interfaces (Game, Emulator, Platform, Collection, PlaySession)
  - `src/stores/useLibraryStore.ts` - Game library state with all 25+ platforms pre-configured
  - `src/stores/useUIStore.ts` - UI state management
  - `src/stores/useSettingsStore.ts` - Persisted settings with Zustand middleware
  - `src/services/library.ts` - Tauri IPC wrappers for library operations
  - `src/services/emulator.ts` - Tauri IPC wrappers for emulator launch
  - `src/index.css` - Global styles with Tailwind, Google Fonts, CSS variables
  - `src/App.tsx` - Placeholder with 3D starfield, cyberpunk styling demo

**Next Steps:**
- Build Rust backend commands (SQLite database, library scanning)
- Create UI components (Sidebar, GameCard, GameDetail, SearchBar)
- Build 3D components (NeonGrid, ParticleField, GameCard3D, HolographicShelf)
- Implement emulator launch functionality

---

### Session 1 Update - Added .gitignore

**Added:**
- Comprehensive `.gitignore` covering:
  - Node/pnpm dependencies
  - Rust/Cargo build artifacts
  - Tauri build outputs and installers
  - Environment files and secrets
  - IDE/editor configurations
  - OS-specific files (macOS, Windows, Linux)
  - Database files, logs, caches
  - ROM file extensions (commented, as reminder)

---

### Session 1 Update - Rust Backend Implementation

**New Dependencies (Cargo.toml):**
- `rusqlite` - SQLite database with bundled SQLite
- `uuid` - UUID generation for IDs
- `chrono` - Date/time handling
- `walkdir` - Directory traversal for library scanning
- `thiserror` - Error handling
- `tokio` - Async runtime
- `regex` - ROM title cleaning

**New Files Created:**

`src-tauri/src/models.rs`:
- `Game` - Full game model with metadata, play time, favorites
- `Emulator` - Emulator configuration with launch arguments
- `Platform` - Gaming platform with file extensions
- `Collection` - User-created game collections
- `PlaySession` - Play time tracking sessions
- `LaunchResult` - Emulator launch result
- Input/Update structs for all entities

`src-tauri/src/db.rs`:
- Thread-safe SQLite database wrapper
- Schema initialization with all tables and indexes
- 30 pre-configured platforms (NES, SNES, PS1, etc.)
- Full CRUD operations for games, emulators, collections
- Play session tracking
- Settings key-value store

`src-tauri/src/commands/mod.rs`:
- **Game Commands**: get_all_games, get_game, add_game, update_game, delete_game, toggle_favorite
- **Emulator Commands**: get_all_emulators, get_emulator, add_emulator, update_emulator, delete_emulator
- **Platform Commands**: get_all_platforms, get_platform, set_default_emulator
- **Collection Commands**: get_all_collections, add_collection, update_collection, delete_collection
- **Library Scanning**: scan_library (recursive ROM detection with extension matching)
- **Launch Commands**: launch_game, launch_game_with_emulator, end_game_session
- **Utility Commands**: validate_emulator_path, get_rom_info, get_setting, set_setting

`src-tauri/src/lib.rs`:
- App state management with database and active sessions
- All Tauri commands wired up
- Database initialized in app data directory

**Supported Platforms (30 total):**
Nintendo: NES, SNES, N64, GameCube, Wii, Switch, GB, GBC, GBA, DS, 3DS
Sony: PS1, PS2, PS3, PSP, Vita
Sega: Genesis, Saturn, Dreamcast, Master System, Game Gear
Microsoft: Xbox, Xbox 360
Other: Arcade, DOS, ScummVM, Atari 2600, Atari 7800, Neo Geo, PC Engine

**Next Steps:**
- Create 3D visual components (NeonGrid, GameCard3D, HolographicShelf)
- Add metadata scraping
- Implement emulator auto-detection

---

### Session 1 Update - UI Components Built

**New Components Created:**

`src/components/layout/MainLayout.tsx`:
- Responsive layout with sidebar, top bar, and main content area
- Animated entrance with Framer Motion
- Glass/blur effects on borders

`src/components/ui/Sidebar.tsx`:
- Platform navigation grouped by manufacturer
- Quick filters: All Games, Favorites, Recently Played
- Game counts per platform
- Animated list items with platform-colored accents
- Neon glow logo

`src/components/ui/TopBar.tsx`:
- Debounced search input (300ms)
- View mode toggle (Grid, List, 3D Shelf)
- Settings button
- SVG icons for all controls

`src/components/ui/GameCard.tsx`:
- Cover art display with fallback placeholder
- Holographic overlay effect on hover
- Scanline shader effect
- Platform badge with dynamic colors
- Favorite toggle button
- Quick play button on hover
- Reflection effect under card

`src/components/ui/GameGrid.tsx`:
- Responsive grid layout
- List view alternative
- Filtering by platform, favorites, recent
- Search filtering (title, developer, publisher)
- Empty states for different scenarios
- Animated card entrance

`src/components/ui/GameDetail.tsx`:
- Full-screen modal with backdrop blur
- Large cover art with platform-colored glow
- Game metadata display (play time, last played, etc.)
- Launch button with loading state
- Favorite and delete actions
- File path display

`src/components/ui/SettingsPanel.tsx`:
- Slide-out panel from right
- Library path management with scan functionality
- Visual effects toggles (scanlines, particles, 3D)
- Theme selection (Cyberpunk, Minimal, Retro CRT)
- Launch settings

**Store Updates:**

`src/stores/useLibraryStore.ts`:
- Now loads data from Rust backend on mount
- API calls for delete, toggle favorite
- Parallel loading of games, platforms, emulators, collections

**App.tsx:**
- Integrated all UI components
- Background particle stars (toggleable)
- Library loads on app start

---

### Session 1 Update - Native Folder Picker

**Feature Added:**
Native OS folder picker dialog for library scanning, supporting Windows, macOS, and Linux.

**Dependencies Added:**
- `@tauri-apps/plugin-dialog` (npm) - Tauri dialog plugin for native file/folder pickers
- `tauri-plugin-dialog = "2"` (Cargo) - Rust backend for dialog functionality

**Configuration:**
- Registered plugin in `src-tauri/src/lib.rs`: `.plugin(tauri_plugin_dialog::init())`

**SettingsPanel.tsx Updates:**
- Added `open()` from `@tauri-apps/plugin-dialog` for native folder selection
- Multi-folder selection support with `{ directory: true, multiple: true }`
- Visual list of selected folders before scanning
- Separate "Add ROM Folders" button that opens native OS file picker
- Scan button appears only when folders are selected
- Scan results display with statistics (Found, Added, Existing counts)
- Library path management:
  - Visual list of saved library folders
  - Remove individual folders from library
  - "Rescan All" button to refresh entire library
- Empty state messaging when no folders configured

**User Flow:**
1. Click "Add ROM Folders" to open native folder picker
2. Select one or multiple folders
3. Selected folders appear in list with remove option
4. Click "Scan X Folder(s)" to begin scan
5. Scan results show games found/added/existing
6. Folders automatically saved to library paths
7. Use "Rescan All" anytime to refresh library

**Files Modified:**
- `src-tauri/Cargo.toml` - Added tauri-plugin-dialog dependency
- `src-tauri/src/lib.rs` - Registered dialog plugin
- `src/components/ui/SettingsPanel.tsx` - Complete rewrite with native folder picker
- `package.json` - Added @tauri-apps/plugin-dialog

---

### Session 2 - January 13, 2026: Emulator Management & RetroArch Integration

**Feature Added:**
Full emulator management system with dedicated UI for adding, editing, and configuring emulators. Special support for RetroArch with automatic core detection.

**Backend Commands Added (src-tauri/src/commands/mod.rs):**

`RetroArchCore` struct:
- `file_name` - Core filename (e.g., "snes9x_libretro.dylib")
- `display_name` - Human-readable name (e.g., "Snes9x")
- `full_path` - Absolute path to the core file

`get_default_retroarch_cores_path`:
- Auto-detects RetroArch cores folder on macOS, Windows, and Linux
- macOS: `~/Library/Application Support/RetroArch/cores`
- Windows: `%APPDATA%/RetroArch/cores` or `C:/RetroArch/cores`
- Linux: `~/.config/retroarch/cores`

`scan_retroarch_cores`:
- Scans a cores folder for RetroArch core files
- Detects platform-specific extensions (.dylib, .dll, .so)
- Extracts display names from core filenames
- Returns list of available cores with paths

**Frontend Services (src/services/library.ts):**
- `getAllEmulators()` - Fetch all configured emulators
- `getEmulator(id)` - Get single emulator by ID
- `addEmulator(input)` - Create new emulator configuration
- `updateEmulator(id, updates)` - Modify existing emulator
- `deleteEmulator(id)` - Remove emulator
- `setDefaultEmulator(platformId, emulatorId)` - Set platform default
- `getDefaultRetroArchCoresPath()` - Get auto-detected cores path
- `scanRetroArchCores(coresPath)` - Scan for available cores

**Frontend Services (src/services/emulator.ts):**
- `launchGame(gameId)` - Launch with default/configured emulator
- `launchGameWithEmulator(gameId, emulatorId)` - Launch with specific emulator
- `endGameSession(gameId)` - End play tracking session
- `validateEmulatorPath(path)` - Check if executable exists

**UI Components (src/components/ui/FullSettingsWindow.tsx):**

Settings tabs added:
- `emulators` - Emulator management
- `retroarch` - RetroArch configuration
- `platforms` - Platform default emulators

**Emulators Tab Features:**
- Add/Edit emulator form with:
  - Name field
  - Executable path with native file picker (supports .app on macOS)
  - Launch arguments with `{rom}` placeholder
  - Multi-select for supported platforms
- Emulator list with edit/delete actions
- Path validation feedback
- Platform badges showing which systems each emulator supports

**RetroArch Tab Features:**
- RetroArch executable path configuration
- Cores folder path with auto-detection
- "Scan Cores" button to discover installed cores
- Core list display with display names
- One-click "Add as Emulator" for each core
- Auto-generates launch arguments: `-L "{core_path}" "{rom}"`
- Cores automatically assigned to appropriate platforms

**Platforms Tab Features:**
- List of all platforms grouped by manufacturer
- Default emulator dropdown per platform
- Shows count of available emulators per platform
- Visual indicator for currently selected default

**Key Implementation Details:**

1. **macOS App Bundle Support**: File picker configured with `filters` to select `.app` bundles, extracting the actual executable path inside

2. **Launch Argument Templates**: Support for `{rom}` and `{title}` placeholders replaced at launch time

3. **RetroArch Core Detection**: Parses `*_libretro.{ext}` filenames to extract friendly display names

4. **Platform Assignment**: When adding a RetroArch core as emulator, intelligently maps core names to platform IDs (e.g., "snes9x" → snes, "genesis_plus_gx" → genesis)

**Files Modified:**
- `src-tauri/src/commands/mod.rs` - Added RetroArch commands and RetroArchCore struct
- `src-tauri/src/lib.rs` - Registered new commands
- `src/services/library.ts` - Added emulator and RetroArch service functions
- `src/services/emulator.ts` - Launch and validation functions
- `src/components/ui/FullSettingsWindow.tsx` - Added Emulators, RetroArch, and Platforms tabs

---

### Session 2 Continued - IGDB Metadata Scraping

**Feature Added:**
IGDB (Internet Game Database) integration for fetching cover art, screenshots, and game metadata.

**New Dependencies (Cargo.toml):**
- `reqwest = { version = "0.11", features = ["json"] }` - HTTP client for API calls
- `tauri-plugin-fs = "2"` - File system plugin for asset protocol
- `tauri = { version = "2", features = ["protocol-asset"] }` - Asset protocol for serving local images

**New Files Created:**

`src-tauri/src/scraper/mod.rs`:
- Module declaration for scraper functionality

`src-tauri/src/scraper/igdb.rs`:
- `IgdbClient` - OAuth token management with automatic refresh
- `IgdbSearchResult` - Search result with cover URL, platforms, summary
- `IgdbGameMetadata` - Full metadata including genres, developer, publisher, screenshots
- `ScrapeResult` / `BatchScrapeResult` - Operation results with camelCase serialization
- Platform ID mapping (30+ platforms to IGDB IDs)
- Image downloading to app data directory

`src/services/scraper.ts`:
- `searchIgdb(query, platformId)` - Search IGDB for games
- `scrapeGameMetadata(gameId, igdbId?)` - Scrape metadata for a single game
- `scrapeLibraryMetadata(onlyMissing)` - Batch scrape entire library
- `validateIgdbCredentials(clientId, clientSecret)` - Validate API credentials
- TypeScript interfaces for all scraper types

**Backend Commands Added (src-tauri/src/commands/mod.rs):**
- `validate_igdb_credentials` - Test IGDB/Twitch OAuth credentials
- `search_igdb` - Search for games by title
- `scrape_game_metadata` - Fetch and save metadata for a single game
- `scrape_library_metadata` - Batch scrape all games

**Frontend Components Modified:**

`src/components/ui/FullSettingsWindow.tsx`:
- New "Metadata" tab for IGDB configuration
- IGDB Client ID and Client Secret input fields
- Credential validation with success/error feedback
- Link to Twitch Developer Portal for registration
- Batch scraping UI with "only missing metadata" option

`src/components/ui/GameDetail.tsx`:
- "Fetch Metadata" button to scrape individual games
- Search modal when multiple matches found
- Cover art display using `convertFileSrc`
- Loading states and error handling
- Store refresh after successful scrape

`src/components/ui/GameCard.tsx`:
- Cover art display using `convertFileSrc`
- Image error state handling
- Reset error state when cover path changes

**Configuration Updates:**

`src-tauri/tauri.conf.json`:
- Added `assetProtocol` configuration with scope for `$APPDATA/**`
- Enables serving local images in webview

`src-tauri/capabilities/default.json`:
- Added `fs:default` permission
- Added `fs:allow-read` with scope for `$APPDATA/**` and `$RESOURCE/**`

**Key Implementation Details:**

1. **OAuth Authentication**: Uses Twitch OAuth (IGDB is owned by Twitch)
   - Client credentials flow for app-level access
   - Token caching with automatic refresh before expiry

2. **Image Storage**: Cover art saved to `<app_data>/images/covers/{game_id}.jpg`

3. **Asset Protocol**: Required for displaying local images in Tauri webview
   - `convertFileSrc()` converts file paths to `asset://localhost/` URLs
   - Requires `protocol-asset` feature flag in Cargo.toml

4. **Serde Serialization**: `#[serde(rename_all = "camelCase")]` on result structs
   - Ensures Rust snake_case fields map to TypeScript camelCase

**IGDB Platform ID Mapping:**
```
nes → 18, snes → 19, n64 → 4, gamecube → 21, wii → 5, switch → 130
gb → 33, gbc → 22, gba → 24, nds → 20, 3ds → 37
ps1 → 7, ps2 → 8, ps3 → 9, psp → 38, vita → 46
genesis → 29, saturn → 32, dreamcast → 23, sms → 64, gamegear → 35
xbox → 11, xbox360 → 12, arcade → 52, dos → 13, 32x → 30
```

**User Flow:**
1. Register app at https://dev.twitch.tv/console
2. Enter Client ID and Client Secret in Settings → Metadata
3. Click "Validate" to test credentials
4. Per-game: Open game detail → Click "Fetch Metadata"
5. Batch: Settings → Metadata → "Scrape All Games"

**Files Modified:**
- `src-tauri/Cargo.toml` - Added reqwest, tauri-plugin-fs, protocol-asset feature
- `src-tauri/src/lib.rs` - Registered scraper module and fs plugin
- `src-tauri/src/commands/mod.rs` - Added 4 scraping commands
- `src-tauri/tauri.conf.json` - Added assetProtocol configuration
- `src-tauri/capabilities/default.json` - Added fs permissions
- `src/stores/useUIStore.ts` - Added 'metadata' settings tab type
- `src/components/ui/GameCard.tsx` - Added convertFileSrc for covers
- `src/components/ui/GameDetail.tsx` - Added scraping UI and cover display
- `src/components/ui/FullSettingsWindow.tsx` - Added Metadata settings tab

**Debugging Notes (Issues Encountered & Resolved):**

1. **IGDB Search Returning Empty Results**
   - Issue: API returned 200 OK but empty array `[]`
   - Root cause: IGDB's `search` keyword doesn't work well with `where` clauses
   - Fix: Removed `where category = 0` from search queries, use simple `search "query"; fields ...; limit 20;`

2. **Black Screen After Scraping**
   - Issue: App crashed with "TypeError: undefined is not an object"
   - Root cause: `ScrapeResult` struct missing `#[serde(rename_all = "camelCase")]`
   - `fields_updated` serialized as snake_case, TypeScript expected `fieldsUpdated`
   - Fix: Added `#[serde(rename_all = "camelCase")]` to `ScrapeResult` and `BatchScrapeResult`

3. **Cover Art Not Displaying (Unsupported URL)**
   - Issue: Images downloaded but showed "failed to load resource: unsupported URL"
   - Root cause: Tauri webview blocks raw `file://` URLs for security
   - Fix: Use `convertFileSrc()` from `@tauri-apps/api/core` to convert paths to `asset://localhost/` URLs

4. **Asset Protocol Not Working**
   - Issue: `convertFileSrc` URLs still failed to load
   - Root cause: Asset protocol not enabled in Tauri 2.x
   - Fix: Added `"protocol-asset"` feature to tauri in Cargo.toml, configured `assetProtocol` in tauri.conf.json with scope

5. **Store Not Refreshing After Scrape**
   - Issue: Scrape succeeded but cover didn't appear until page reload
   - Root cause: `handleScrapeMetadata` wasn't fetching updated game data after scrape
   - Fix: Added `getGame()` call and `updateGameInStore()` after successful scrape

---

### Session 3 - January 14, 2026: 3D Visual Components (CyberpunkEnvironment & NeonGrid)

**Feature Added:**
Started building the 3D visual system with cyberpunk holographic aesthetics. Implemented the scene foundation and iconic neon grid floor.

**New Dependencies:**
- `postprocessing` - Peer dependency for @react-three/postprocessing effects

**New Files Created:**

`src/components/three/CyberpunkEnvironment.tsx`:
- Scene wrapper component with cyberpunk lighting and post-processing
- Animated neon point lights (cyan, magenta, orange accents)
- Scene fog for depth perception
- Post-processing pipeline:
  - **Bloom** - Neon glow effect on bright elements
  - **ChromaticAberration** - Subtle RGB split for cyberpunk feel
  - **Vignette** - Darkened edges for focus
  - **Noise** - Film grain texture
- All effects toggleable via props (respects `enable3DEffects` setting)
- Lights animate position and intensity over time

`src/components/three/NeonGrid.tsx`:
- Infinite cyberpunk grid floor with custom GLSL shader
- Features:
  - Animated scrolling grid lines
  - Dual-color gradient (cyan ↔ magenta)
  - Distance-based fade for infinite illusion
  - Major grid lines every 5 units (thicker/brighter)
  - Pulsing glow effect synchronized with distance
- Configurable props: size, gridSize, colors, fadeDistance, speed, glowIntensity
- `NeonGridReflection` helper component for mirror effects

`src/components/three/index.ts`:
- Barrel exports for all 3D components

**App.tsx Integration:**
- Replaced simple Stars background with full CyberpunkEnvironment
- NeonGrid rendered at y=0 as the floor
- Stars retained for distant depth
- Camera positioned at [0, 8, 20] looking down at grid
- Wrapped in Suspense for async loading
- Effects controlled by `enable3DEffects` setting toggle

**Technical Implementation Details:**

1. **Custom Shader Material (drei's shaderMaterial)**
   - Created `NeonGridMaterialImpl` with uniforms for animation
   - Extended Three.js via `extend({ NeonGridMaterial: ... })`
   - TypeScript module augmentation for `ThreeElements` interface
   - `useFrame` hook animates `uTime` uniform each frame

2. **GLSL Shader Highlights**
   ```glsl
   // Grid pattern using fwidth for anti-aliasing
   vec2 grid = abs(fract(worldUv / uGridSize - 0.5) - 0.5) / fwidth(worldUv / uGridSize);

   // Color gradient based on distance from origin
   float colorMix = sin(dist * 0.1 + uTime * 0.5) * 0.5 + 0.5;
   vec3 color = mix(uColor1, uColor2, colorMix);

   // Pulse effect radiating outward
   float pulse = sin(uTime * 2.0 - dist * 0.2) * 0.3 + 0.7;
   ```

3. **Post-Processing Setup**
   - EffectComposer from @react-three/postprocessing
   - Effects rendered with intensity 0 when disabled (avoids conditional rendering issues)
   - BlendFunction.NORMAL for standard compositing

4. **Performance Considerations**
   - Memoized color objects to prevent recreation
   - Single plane geometry for grid (no subdivision needed)
   - depthWrite disabled on grid material for proper transparency
   - Suspense boundary prevents blocking on shader compilation

**Files Modified:**
- `src/App.tsx` - Integrated CyberpunkEnvironment and NeonGrid
- `package.json` - Added postprocessing dependency

**Visual Result:**
The app now displays an animated neon grid floor with:
- Cyan and magenta glowing grid lines scrolling toward the camera
- Bloom effect making neon colors glow
- Subtle chromatic aberration for that sci-fi display look
- Vignette darkening the edges
- Distant stars in the background
- Animated lights casting colored illumination

**Debugging Session - WebGL Context Lost Fix:**

Initial attempt caused "THREE.WebGLRenderer: Context Lost" crash. Through systematic testing:

1. **Root Cause**: Combination of settings, not any single effect
   - Original: `dpr={[1, 2]}`, `alpha: false`, absolute positioning
   - The Canvas was rendering but hidden behind opaque UI backgrounds

2. **Fixes Applied**:
   - Changed Canvas container from `absolute` to `fixed` positioning with `z-0`
   - Set `dpr={1}` (fixed) instead of `dpr={[1, 2]}` (variable)
   - Made body background transparent in `index.css`
   - Made MainLayout backgrounds semi-transparent (`bg-deep-purple/70`, `bg-void-black/70`)
   - Removed `alpha: true` and transparency hacks - using solid scene background

3. **All Effects Working**:
   - ✅ Bloom (neon glow)
   - ✅ ChromaticAberration (RGB split)
   - ✅ Vignette (darkened edges)
   - ✅ Noise (film grain)

4. **Settings Integration**:
   - `enableParticles` controls whether 3D scene renders at all
   - `enable3DEffects` controls post-processing effects (can disable for performance)

**Next Steps:**
- Build ParticleField component (floating data particles)
- Build GameCard3D component (holographic floating cards)
- Build HolographicShelf component (3D view mode for games)
