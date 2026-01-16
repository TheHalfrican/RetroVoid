use rusqlite::{Connection, Result, params};
use std::path::PathBuf;
use std::sync::Mutex;

use crate::models::*;

/// Database wrapper with thread-safe connection
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    /// Create a new database connection
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(&db_path)?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        db.init_default_platforms()?;
        db.run_migrations()?;
        Ok(db)
    }

    /// Run database migrations
    fn run_migrations(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // Get current schema version
        let version: i32 = conn
            .query_row(
                "SELECT COALESCE((SELECT CAST(value AS INTEGER) FROM settings WHERE key = 'schema_version'), 0)",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        // Migration 1: Remove .bin from PS1 extensions (causes duplicates with .cue files)
        if version < 1 {
            conn.execute(
                r#"UPDATE platforms SET file_extensions = '[".cue", ".chd", ".iso"]' WHERE id = 'ps1'"#,
                [],
            )?;

            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '1')",
                [],
            )?;
        }

        // Migration 2: Ensure PS1 .bin is removed (re-run in case migration 1 had issues)
        if version < 2 {
            // Unconditionally set PS1 extensions to exclude .bin
            conn.execute(
                r#"UPDATE platforms SET file_extensions = '[".cue", ".chd", ".iso"]' WHERE id = 'ps1'"#,
                [],
            )?;

            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '2')",
                [],
            )?;
        }

        // Migration 3: Update Dreamcast extensions to prefer .cue over .gdi (avoid duplicates)
        if version < 3 {
            conn.execute(
                r#"UPDATE platforms SET file_extensions = '[".cue", ".cdi", ".chd"]' WHERE id = 'dreamcast'"#,
                [],
            )?;

            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '3')",
                [],
            )?;
        }

        // Migration 4: Add .stfs support for Xbox 360
        if version < 4 {
            conn.execute(
                r#"UPDATE platforms SET file_extensions = '[".iso", ".stfs"]' WHERE id = 'xbox360'"#,
                [],
            )?;

            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '4')",
                [],
            )?;
        }

        // Migration 5: Add .wad support for Wii (WiiWare/Virtual Console)
        if version < 5 {
            conn.execute(
                r#"UPDATE platforms SET file_extensions = '[".iso", ".wbfs", ".rvz", ".wad"]' WHERE id = 'wii'"#,
                [],
            )?;

            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '5')",
                [],
            )?;
        }

        // Migration 6: Remove .pkg from PS3 (too ambiguous - could be games, DLC, or updates)
        // PS3 disc games are detected via PS3_DISC.SFB directory structure instead
        if version < 6 {
            conn.execute(
                r#"UPDATE platforms SET file_extensions = '[]' WHERE id = 'ps3'"#,
                [],
            )?;

            conn.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '6')",
                [],
            )?;
        }

        Ok(())
    }

    /// Initialize the database schema
    fn init_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        conn.execute_batch(
            r#"
            -- Games table
            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                rom_path TEXT NOT NULL UNIQUE,
                platform_id TEXT NOT NULL,
                cover_art_path TEXT,
                background_path TEXT,
                screenshots TEXT DEFAULT '[]',
                description TEXT,
                release_date TEXT,
                genre TEXT DEFAULT '[]',
                developer TEXT,
                publisher TEXT,
                total_play_time_seconds INTEGER DEFAULT 0,
                last_played TEXT,
                is_favorite INTEGER DEFAULT 0,
                preferred_emulator_id TEXT,
                collection_ids TEXT DEFAULT '[]',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- Emulators table
            CREATE TABLE IF NOT EXISTS emulators (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                executable_path TEXT NOT NULL,
                launch_arguments TEXT DEFAULT '{rom}',
                supported_platform_ids TEXT DEFAULT '[]',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- Platforms table
            CREATE TABLE IF NOT EXISTS platforms (
                id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                manufacturer TEXT NOT NULL,
                file_extensions TEXT DEFAULT '[]',
                icon_path TEXT,
                default_emulator_id TEXT,
                color TEXT DEFAULT '#00f5ff'
            );

            -- Collections table
            CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                game_ids TEXT DEFAULT '[]',
                cover_game_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            -- Play sessions table
            CREATE TABLE IF NOT EXISTS play_sessions (
                id TEXT PRIMARY KEY,
                game_id TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT,
                duration_seconds INTEGER DEFAULT 0,
                FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
            );

            -- Settings table (key-value store)
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            -- Create indexes for better query performance
            CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platform_id);
            CREATE INDEX IF NOT EXISTS idx_games_favorite ON games(is_favorite);
            CREATE INDEX IF NOT EXISTS idx_games_last_played ON games(last_played);
            CREATE INDEX IF NOT EXISTS idx_play_sessions_game ON play_sessions(game_id);
            "#,
        )?;

        Ok(())
    }

    /// Initialize default platforms
    fn init_default_platforms(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        let platforms = vec![
            ("nes", "NES", "Nintendo", r#"[".nes", ".unf"]"#, "#e60012"),
            ("snes", "SNES", "Nintendo", r#"[".sfc", ".smc"]"#, "#7b5aa6"),
            ("n64", "Nintendo 64", "Nintendo", r#"[".n64", ".z64", ".v64"]"#, "#009e60"),
            ("gamecube", "GameCube", "Nintendo", r#"[".iso", ".gcz", ".rvz"]"#, "#6a5acd"),
            ("wii", "Wii", "Nintendo", r#"[".iso", ".wbfs", ".rvz", ".wad"]"#, "#00a0dc"),
            ("switch", "Nintendo Switch", "Nintendo", r#"[".nsp", ".xci"]"#, "#e60012"),
            ("gb", "Game Boy", "Nintendo", r#"[".gb"]"#, "#8b956d"),
            ("gbc", "Game Boy Color", "Nintendo", r#"[".gbc"]"#, "#6b5b95"),
            ("gba", "Game Boy Advance", "Nintendo", r#"[".gba"]"#, "#5b5ea6"),
            ("nds", "Nintendo DS", "Nintendo", r#"[".nds"]"#, "#c0c0c0"),
            ("3ds", "Nintendo 3DS", "Nintendo", r#"[".3ds", ".cia"]"#, "#ce1141"),
            ("virtualboy", "Virtual Boy", "Nintendo", r#"[".vb", ".vboy"]"#, "#e60012"),
            ("ps1", "PlayStation", "Sony", r#"[".cue", ".chd", ".iso", ".m3u"]"#, "#003087"),
            ("ps2", "PlayStation 2", "Sony", r#"[".iso", ".chd", ".m3u"]"#, "#003087"),
            ("ps3", "PlayStation 3", "Sony", r#"[]"#, "#003087"),
            ("psp", "PlayStation Portable", "Sony", r#"[".iso", ".cso"]"#, "#003087"),
            ("vita", "PlayStation Vita", "Sony", r#"[".vpk", ".zip"]"#, "#003087"),
            ("genesis", "Sega Genesis", "Sega", r#"[".md", ".gen", ".bin"]"#, "#0060a8"),
            ("saturn", "Sega Saturn", "Sega", r#"[".iso", ".cue", ".chd", ".m3u"]"#, "#0060a8"),
            ("dreamcast", "Dreamcast", "Sega", r#"[".cue", ".cdi", ".chd"]"#, "#ff6600"),
            ("mastersystem", "Master System", "Sega", r#"[".sms"]"#, "#0060a8"),
            ("gamegear", "Game Gear", "Sega", r#"[".gg"]"#, "#0060a8"),
            ("xbox", "Xbox", "Microsoft", r#"[".iso"]"#, "#107c10"),
            ("xbox360", "Xbox 360", "Microsoft", r#"[".iso", ".stfs"]"#, "#107c10"),
            ("arcade", "Arcade", "Various", r#"[".zip"]"#, "#ff00ff"),
            ("dos", "DOS", "PC", r#"[".exe", ".com"]"#, "#00ff00"),
            ("scummvm", "ScummVM", "PC", r#"[]"#, "#8b4513"),
            ("windows", "Windows", "PC", r#"[]"#, "#0078d4"),
            ("atari2600", "Atari 2600", "Atari", r#"[".a26", ".bin"]"#, "#ff0000"),
            ("atari7800", "Atari 7800", "Atari", r#"[".a78", ".bin"]"#, "#ff0000"),
            ("atarijaguar", "Atari Jaguar", "Atari", r#"[".j64", ".jag", ".rom"]"#, "#ff0000"),
            ("3do", "3DO", "Panasonic", r#"[".iso", ".chd", ".cue", ".m3u"]"#, "#d4af37"),
            ("neogeo", "Neo Geo", "SNK", r#"[".zip"]"#, "#ffd700"),
            ("pcengine", "PC Engine", "NEC", r#"[".pce"]"#, "#ff4500"),
        ];

        for (id, name, manufacturer, extensions, color) in platforms {
            conn.execute(
                "INSERT OR IGNORE INTO platforms (id, display_name, manufacturer, file_extensions, color) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, name, manufacturer, extensions, color],
            )?;
        }

        Ok(())
    }

    // ==================== GAMES ====================

    /// Get all games
    pub fn get_all_games(&self) -> Result<Vec<Game>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, rom_path, platform_id, cover_art_path, background_path,
                    screenshots, description, release_date, genre, developer, publisher,
                    total_play_time_seconds, last_played, is_favorite, preferred_emulator_id,
                    collection_ids, created_at FROM games ORDER BY title"
        )?;

        let games = stmt.query_map([], |row| {
            Ok(Game {
                id: row.get(0)?,
                title: row.get(1)?,
                rom_path: row.get(2)?,
                platform_id: row.get(3)?,
                cover_art_path: row.get(4)?,
                background_path: row.get(5)?,
                screenshots: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
                description: row.get(7)?,
                release_date: row.get(8)?,
                genre: serde_json::from_str(&row.get::<_, String>(9)?).unwrap_or_default(),
                developer: row.get(10)?,
                publisher: row.get(11)?,
                total_play_time_seconds: row.get(12)?,
                last_played: row.get(13)?,
                is_favorite: row.get::<_, i32>(14)? == 1,
                preferred_emulator_id: row.get(15)?,
                collection_ids: serde_json::from_str(&row.get::<_, String>(16)?).unwrap_or_default(),
                created_at: row.get(17)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(games)
    }

    /// Get a single game by ID
    pub fn get_game(&self, id: &str) -> Result<Option<Game>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, rom_path, platform_id, cover_art_path, background_path,
                    screenshots, description, release_date, genre, developer, publisher,
                    total_play_time_seconds, last_played, is_favorite, preferred_emulator_id,
                    collection_ids, created_at FROM games WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Game {
                id: row.get(0)?,
                title: row.get(1)?,
                rom_path: row.get(2)?,
                platform_id: row.get(3)?,
                cover_art_path: row.get(4)?,
                background_path: row.get(5)?,
                screenshots: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
                description: row.get(7)?,
                release_date: row.get(8)?,
                genre: serde_json::from_str(&row.get::<_, String>(9)?).unwrap_or_default(),
                developer: row.get(10)?,
                publisher: row.get(11)?,
                total_play_time_seconds: row.get(12)?,
                last_played: row.get(13)?,
                is_favorite: row.get::<_, i32>(14)? == 1,
                preferred_emulator_id: row.get(15)?,
                collection_ids: serde_json::from_str(&row.get::<_, String>(16)?).unwrap_or_default(),
                created_at: row.get(17)?,
            }))
        } else {
            Ok(None)
        }
    }

    /// Get a game by ROM path
    pub fn get_game_by_path(&self, rom_path: &str) -> Result<Option<Game>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, rom_path, platform_id, cover_art_path, background_path,
                    screenshots, description, release_date, genre, developer, publisher,
                    total_play_time_seconds, last_played, is_favorite, preferred_emulator_id,
                    collection_ids, created_at FROM games WHERE rom_path = ?1"
        )?;

        let mut rows = stmt.query(params![rom_path])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Game {
                id: row.get(0)?,
                title: row.get(1)?,
                rom_path: row.get(2)?,
                platform_id: row.get(3)?,
                cover_art_path: row.get(4)?,
                background_path: row.get(5)?,
                screenshots: serde_json::from_str(&row.get::<_, String>(6)?).unwrap_or_default(),
                description: row.get(7)?,
                release_date: row.get(8)?,
                genre: serde_json::from_str(&row.get::<_, String>(9)?).unwrap_or_default(),
                developer: row.get(10)?,
                publisher: row.get(11)?,
                total_play_time_seconds: row.get(12)?,
                last_played: row.get(13)?,
                is_favorite: row.get::<_, i32>(14)? == 1,
                preferred_emulator_id: row.get(15)?,
                collection_ids: serde_json::from_str(&row.get::<_, String>(16)?).unwrap_or_default(),
                created_at: row.get(17)?,
            }))
        } else {
            Ok(None)
        }
    }

    /// Add a new game
    pub fn add_game(&self, game: &Game) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO games (id, title, rom_path, platform_id, cover_art_path, background_path,
                               screenshots, description, release_date, genre, developer, publisher,
                               total_play_time_seconds, last_played, is_favorite, preferred_emulator_id,
                               collection_ids)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                game.id,
                game.title,
                game.rom_path,
                game.platform_id,
                game.cover_art_path,
                game.background_path,
                serde_json::to_string(&game.screenshots).unwrap(),
                game.description,
                game.release_date,
                serde_json::to_string(&game.genre).unwrap(),
                game.developer,
                game.publisher,
                game.total_play_time_seconds,
                game.last_played,
                if game.is_favorite { 1 } else { 0 },
                game.preferred_emulator_id,
                serde_json::to_string(&game.collection_ids).unwrap(),
            ],
        )?;
        Ok(())
    }

    /// Update a game
    pub fn update_game(&self, id: &str, updates: &UpdateGameInput) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        if let Some(title) = &updates.title {
            conn.execute("UPDATE games SET title = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![title, id])?;
        }
        if let Some(platform_id) = &updates.platform_id {
            conn.execute("UPDATE games SET platform_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![platform_id, id])?;
        }
        if let Some(cover_art_path) = &updates.cover_art_path {
            conn.execute("UPDATE games SET cover_art_path = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![cover_art_path, id])?;
        }
        if let Some(background_path) = &updates.background_path {
            conn.execute("UPDATE games SET background_path = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![background_path, id])?;
        }
        if let Some(screenshots) = &updates.screenshots {
            let screenshots_json = serde_json::to_string(screenshots).unwrap();
            conn.execute("UPDATE games SET screenshots = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![screenshots_json, id])?;
        }
        if let Some(description) = &updates.description {
            conn.execute("UPDATE games SET description = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![description, id])?;
        }
        if let Some(release_date) = &updates.release_date {
            conn.execute("UPDATE games SET release_date = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![release_date, id])?;
        }
        if let Some(genre) = &updates.genre {
            let genre_json = serde_json::to_string(genre).unwrap();
            conn.execute("UPDATE games SET genre = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![genre_json, id])?;
        }
        if let Some(developer) = &updates.developer {
            conn.execute("UPDATE games SET developer = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![developer, id])?;
        }
        if let Some(publisher) = &updates.publisher {
            conn.execute("UPDATE games SET publisher = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![publisher, id])?;
        }
        if let Some(is_favorite) = updates.is_favorite {
            conn.execute("UPDATE games SET is_favorite = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![if is_favorite { 1 } else { 0 }, id])?;
        }
        if let Some(preferred_emulator_id) = &updates.preferred_emulator_id {
            conn.execute("UPDATE games SET preferred_emulator_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![preferred_emulator_id, id])?;
        }

        Ok(())
    }

    /// Delete a game
    pub fn delete_game(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM games WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Delete multiple games in a single transaction
    pub fn delete_games_batch(&self, ids: &[String]) -> Result<usize> {
        let conn = self.conn.lock().unwrap();
        let mut deleted = 0;
        for id in ids {
            deleted += conn.execute("DELETE FROM games WHERE id = ?1", params![id])?;
        }
        Ok(deleted)
    }

    /// Update game play time
    pub fn update_game_play_time(&self, id: &str, additional_seconds: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE games SET total_play_time_seconds = total_play_time_seconds + ?1,
                             last_played = CURRENT_TIMESTAMP,
                             updated_at = CURRENT_TIMESTAMP
             WHERE id = ?2",
            params![additional_seconds, id],
        )?;
        Ok(())
    }

    /// Toggle game favorite status
    pub fn toggle_favorite(&self, id: &str) -> Result<bool> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE games SET is_favorite = NOT is_favorite, updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![id],
        )?;

        let is_favorite: i32 = conn.query_row(
            "SELECT is_favorite FROM games WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )?;

        Ok(is_favorite == 1)
    }

    // ==================== EMULATORS ====================

    /// Get all emulators
    pub fn get_all_emulators(&self) -> Result<Vec<Emulator>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, executable_path, launch_arguments, supported_platform_ids FROM emulators ORDER BY name"
        )?;

        let emulators = stmt.query_map([], |row| {
            Ok(Emulator {
                id: row.get(0)?,
                name: row.get(1)?,
                executable_path: row.get(2)?,
                launch_arguments: row.get(3)?,
                supported_platform_ids: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(emulators)
    }

    /// Get a single emulator by ID
    pub fn get_emulator(&self, id: &str) -> Result<Option<Emulator>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, executable_path, launch_arguments, supported_platform_ids FROM emulators WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Emulator {
                id: row.get(0)?,
                name: row.get(1)?,
                executable_path: row.get(2)?,
                launch_arguments: row.get(3)?,
                supported_platform_ids: serde_json::from_str(&row.get::<_, String>(4)?).unwrap_or_default(),
            }))
        } else {
            Ok(None)
        }
    }

    /// Add a new emulator
    pub fn add_emulator(&self, emulator: &Emulator) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO emulators (id, name, executable_path, launch_arguments, supported_platform_ids)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                emulator.id,
                emulator.name,
                emulator.executable_path,
                emulator.launch_arguments,
                serde_json::to_string(&emulator.supported_platform_ids).unwrap(),
            ],
        )?;
        Ok(())
    }

    /// Update an emulator
    pub fn update_emulator(&self, id: &str, updates: &UpdateEmulatorInput) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        if let Some(name) = &updates.name {
            conn.execute("UPDATE emulators SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![name, id])?;
        }
        if let Some(executable_path) = &updates.executable_path {
            conn.execute("UPDATE emulators SET executable_path = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![executable_path, id])?;
        }
        if let Some(launch_arguments) = &updates.launch_arguments {
            conn.execute("UPDATE emulators SET launch_arguments = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![launch_arguments, id])?;
        }
        if let Some(supported_platform_ids) = &updates.supported_platform_ids {
            let json = serde_json::to_string(supported_platform_ids).unwrap();
            conn.execute("UPDATE emulators SET supported_platform_ids = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![json, id])?;
        }

        Ok(())
    }

    /// Delete an emulator
    pub fn delete_emulator(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM emulators WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ==================== PLATFORMS ====================

    /// Get all platforms
    pub fn get_all_platforms(&self) -> Result<Vec<Platform>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, display_name, manufacturer, file_extensions, icon_path, default_emulator_id, color
             FROM platforms ORDER BY manufacturer, display_name"
        )?;

        let platforms = stmt.query_map([], |row| {
            Ok(Platform {
                id: row.get(0)?,
                display_name: row.get(1)?,
                manufacturer: row.get(2)?,
                file_extensions: serde_json::from_str(&row.get::<_, String>(3)?).unwrap_or_default(),
                icon_path: row.get(4)?,
                default_emulator_id: row.get(5)?,
                color: row.get(6)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(platforms)
    }

    /// Get a platform by ID
    pub fn get_platform(&self, id: &str) -> Result<Option<Platform>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, display_name, manufacturer, file_extensions, icon_path, default_emulator_id, color
             FROM platforms WHERE id = ?1"
        )?;

        let mut rows = stmt.query(params![id])?;

        if let Some(row) = rows.next()? {
            Ok(Some(Platform {
                id: row.get(0)?,
                display_name: row.get(1)?,
                manufacturer: row.get(2)?,
                file_extensions: serde_json::from_str(&row.get::<_, String>(3)?).unwrap_or_default(),
                icon_path: row.get(4)?,
                default_emulator_id: row.get(5)?,
                color: row.get(6)?,
            }))
        } else {
            Ok(None)
        }
    }

    /// Set default emulator for a platform
    pub fn set_platform_default_emulator(&self, platform_id: &str, emulator_id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE platforms SET default_emulator_id = ?1 WHERE id = ?2",
            params![emulator_id, platform_id],
        )?;
        Ok(())
    }

    // ==================== COLLECTIONS ====================

    /// Get all collections
    pub fn get_all_collections(&self) -> Result<Vec<Collection>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, game_ids, cover_game_id FROM collections ORDER BY name"
        )?;

        let collections = stmt.query_map([], |row| {
            Ok(Collection {
                id: row.get(0)?,
                name: row.get(1)?,
                game_ids: serde_json::from_str(&row.get::<_, String>(2)?).unwrap_or_default(),
                cover_game_id: row.get(3)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(collections)
    }

    /// Add a new collection
    pub fn add_collection(&self, collection: &Collection) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO collections (id, name, game_ids, cover_game_id) VALUES (?1, ?2, ?3, ?4)",
            params![
                collection.id,
                collection.name,
                serde_json::to_string(&collection.game_ids).unwrap(),
                collection.cover_game_id,
            ],
        )?;
        Ok(())
    }

    /// Update a collection
    pub fn update_collection(&self, id: &str, updates: &UpdateCollectionInput) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        if let Some(name) = &updates.name {
            conn.execute("UPDATE collections SET name = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![name, id])?;
        }
        if let Some(game_ids) = &updates.game_ids {
            let json = serde_json::to_string(game_ids).unwrap();
            conn.execute("UPDATE collections SET game_ids = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![json, id])?;
        }
        if let Some(cover_game_id) = &updates.cover_game_id {
            conn.execute("UPDATE collections SET cover_game_id = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2", params![cover_game_id, id])?;
        }

        Ok(())
    }

    /// Delete a collection
    pub fn delete_collection(&self, id: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM collections WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ==================== PLAY SESSIONS ====================

    /// Create a new play session
    pub fn create_play_session(&self, session: &PlaySession) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO play_sessions (id, game_id, start_time, end_time, duration_seconds) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                session.id,
                session.game_id,
                session.start_time,
                session.end_time,
                session.duration_seconds,
            ],
        )?;
        Ok(())
    }

    /// End a play session
    pub fn end_play_session(&self, session_id: &str, end_time: &str, duration_seconds: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE play_sessions SET end_time = ?1, duration_seconds = ?2 WHERE id = ?3",
            params![end_time, duration_seconds, session_id],
        )?;
        Ok(())
    }

    /// Get play sessions for a game
    pub fn get_play_sessions(&self, game_id: &str) -> Result<Vec<PlaySession>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, game_id, start_time, end_time, duration_seconds FROM play_sessions WHERE game_id = ?1 ORDER BY start_time DESC"
        )?;

        let sessions = stmt.query_map(params![game_id], |row| {
            Ok(PlaySession {
                id: row.get(0)?,
                game_id: row.get(1)?,
                start_time: row.get(2)?,
                end_time: row.get(3)?,
                duration_seconds: row.get(4)?,
            })
        })?.collect::<Result<Vec<_>>>()?;

        Ok(sessions)
    }

    // ==================== SETTINGS ====================

    /// Get a setting value
    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let result: rusqlite::Result<String> = conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |row| row.get(0),
        );

        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Set a setting value
    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }
}
