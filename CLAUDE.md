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
