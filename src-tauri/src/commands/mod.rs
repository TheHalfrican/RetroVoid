use std::collections::HashMap;
use std::path::Path;
use std::process::Command;
use std::sync::Mutex;
use tauri::State;
use walkdir::WalkDir;

use crate::db::Database;
use crate::models::*;

/// App state that holds the database and active sessions
pub struct AppState {
    pub db: Database,
    pub active_sessions: Mutex<HashMap<String, ActiveSession>>,
}

/// Represents an active game session for tracking
pub struct ActiveSession {
    pub session_id: String,
    pub game_id: String,
    pub start_time: chrono::DateTime<chrono::Utc>,
    pub pid: Option<u32>,
}

// ==================== GAME COMMANDS ====================

#[tauri::command]
pub fn get_all_games(state: State<AppState>) -> Result<Vec<Game>, String> {
    state.db.get_all_games().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_game(id: String, state: State<AppState>) -> Result<Option<Game>, String> {
    state.db.get_game(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_game(input: CreateGameInput, state: State<AppState>) -> Result<Game, String> {
    let mut game = Game::new(input.title, input.rom_path, input.platform_id);
    game.cover_art_path = input.cover_art_path;
    game.description = input.description;

    state.db.add_game(&game).map_err(|e| e.to_string())?;
    Ok(game)
}

#[tauri::command]
pub fn update_game(id: String, updates: UpdateGameInput, state: State<AppState>) -> Result<(), String> {
    state.db.update_game(&id, &updates).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_game(id: String, state: State<AppState>) -> Result<(), String> {
    state.db.delete_game(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn toggle_favorite(id: String, state: State<AppState>) -> Result<bool, String> {
    state.db.toggle_favorite(&id).map_err(|e| e.to_string())
}

// ==================== EMULATOR COMMANDS ====================

#[tauri::command]
pub fn get_all_emulators(state: State<AppState>) -> Result<Vec<Emulator>, String> {
    state.db.get_all_emulators().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_emulator(id: String, state: State<AppState>) -> Result<Option<Emulator>, String> {
    state.db.get_emulator(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_emulator(input: CreateEmulatorInput, state: State<AppState>) -> Result<Emulator, String> {
    let mut emulator = Emulator::new(input.name, input.executable_path);
    if let Some(args) = input.launch_arguments {
        emulator.launch_arguments = args;
    }
    emulator.supported_platform_ids = input.supported_platform_ids;

    state.db.add_emulator(&emulator).map_err(|e| e.to_string())?;
    Ok(emulator)
}

#[tauri::command]
pub fn update_emulator(id: String, updates: UpdateEmulatorInput, state: State<AppState>) -> Result<(), String> {
    state.db.update_emulator(&id, &updates).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_emulator(id: String, state: State<AppState>) -> Result<(), String> {
    state.db.delete_emulator(&id).map_err(|e| e.to_string())
}

// ==================== PLATFORM COMMANDS ====================

#[tauri::command]
pub fn get_all_platforms(state: State<AppState>) -> Result<Vec<Platform>, String> {
    state.db.get_all_platforms().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_platform(id: String, state: State<AppState>) -> Result<Option<Platform>, String> {
    state.db.get_platform(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_default_emulator(platform_id: String, emulator_id: String, state: State<AppState>) -> Result<(), String> {
    state.db.set_platform_default_emulator(&platform_id, &emulator_id).map_err(|e| e.to_string())
}

// ==================== COLLECTION COMMANDS ====================

#[tauri::command]
pub fn get_all_collections(state: State<AppState>) -> Result<Vec<Collection>, String> {
    state.db.get_all_collections().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_collection(input: CreateCollectionInput, state: State<AppState>) -> Result<Collection, String> {
    let collection = Collection::new(input.name);
    state.db.add_collection(&collection).map_err(|e| e.to_string())?;
    Ok(collection)
}

#[tauri::command]
pub fn update_collection(id: String, updates: UpdateCollectionInput, state: State<AppState>) -> Result<(), String> {
    state.db.update_collection(&id, &updates).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_collection(id: String, state: State<AppState>) -> Result<(), String> {
    state.db.delete_collection(&id).map_err(|e| e.to_string())
}

// ==================== LIBRARY SCANNING ====================

/// Input for scanning with optional platform override
#[derive(serde::Deserialize)]
pub struct ScanPath {
    pub path: String,
    pub platform_id: Option<String>,  // If specified, all games in this folder will use this platform
}

#[tauri::command]
pub fn scan_library(paths: Vec<ScanPath>, state: State<AppState>) -> Result<ScanResult, String> {
    let platforms = state.db.get_all_platforms().map_err(|e| e.to_string())?;

    // Build extension -> platforms mapping (one extension can map to multiple platforms)
    let mut ext_to_platforms: HashMap<String, Vec<String>> = HashMap::new();
    for platform in &platforms {
        for ext in &platform.file_extensions {
            ext_to_platforms
                .entry(ext.to_lowercase())
                .or_default()
                .push(platform.id.clone());
        }
    }

    // Build platform hints for folder path detection
    let platform_hints: Vec<(&str, Vec<&str>)> = vec![
        ("ps2", vec!["ps2", "playstation 2", "playstation2", "sony ps2"]),
        ("ps1", vec!["ps1", "psx", "playstation 1", "playstation1", "psone"]),
        ("psp", vec!["psp", "playstation portable"]),
        ("ps3", vec!["ps3", "playstation 3", "playstation3"]),
        ("vita", vec!["vita", "psvita", "ps vita"]),
        ("gamecube", vec!["gamecube", "gcn", "ngc", "nintendo gamecube"]),
        ("wii", vec!["wii", "nintendo wii"]),
        ("switch", vec!["switch", "nintendo switch", "nx"]),
        ("n64", vec!["n64", "nintendo 64", "nintendo64"]),
        ("snes", vec!["snes", "super nintendo", "super nes", "sfc"]),
        ("nes", vec!["nes", "nintendo entertainment", "famicom"]),
        ("gba", vec!["gba", "gameboy advance", "game boy advance"]),
        ("gbc", vec!["gbc", "gameboy color", "game boy color"]),
        ("gb", vec!["gameboy", "game boy"]),
        ("nds", vec!["nds", "nintendo ds", "ds"]),
        ("3ds", vec!["3ds", "nintendo 3ds"]),
        ("genesis", vec!["genesis", "mega drive", "megadrive", "sega genesis"]),
        ("saturn", vec!["saturn", "sega saturn"]),
        ("dreamcast", vec!["dreamcast", "sega dreamcast"]),
        ("xbox", vec!["xbox", "original xbox"]),
        ("xbox360", vec!["xbox 360", "xbox360", "x360"]),
        ("arcade", vec!["arcade", "mame", "fba", "fbneo"]),
    ];

    let mut result = ScanResult {
        games_found: 0,
        games_added: 0,
        games_updated: 0,
        errors: Vec::new(),
    };

    for scan_path in paths {
        let path = Path::new(&scan_path.path);
        if !path.exists() {
            result.errors.push(format!("Path does not exist: {}", path.display()));
            continue;
        }

        for entry in WalkDir::new(path)
            .follow_links(true)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if !entry.file_type().is_file() {
                continue;
            }

            let file_path = entry.path();
            let extension = file_path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| format!(".{}", e.to_lowercase()));

            if let Some(ext) = extension {
                if let Some(possible_platforms) = ext_to_platforms.get(&ext) {
                    result.games_found += 1;

                    let rom_path = file_path.to_string_lossy().to_string();

                    // Determine the platform
                    let platform_id = if let Some(ref override_id) = scan_path.platform_id {
                        // User specified platform for this folder
                        override_id.clone()
                    } else if possible_platforms.len() == 1 {
                        // Only one platform matches this extension
                        possible_platforms[0].clone()
                    } else {
                        // Multiple platforms match - try to detect from path
                        detect_platform_from_path(&rom_path, &platform_hints)
                            .unwrap_or_else(|| possible_platforms[0].clone())
                    };

                    // Check if game already exists
                    match state.db.get_game_by_path(&rom_path) {
                        Ok(Some(_)) => {
                            // Game exists, could update here if needed
                            result.games_updated += 1;
                        }
                        Ok(None) => {
                            // New game, add it
                            let title = file_path
                                .file_stem()
                                .and_then(|s| s.to_str())
                                .unwrap_or("Unknown")
                                .to_string();

                            // Clean up common ROM naming patterns
                            let title = clean_rom_title(&title);

                            let game = Game::new(title, rom_path, platform_id);

                            if let Err(e) = state.db.add_game(&game) {
                                result.errors.push(format!("Failed to add {}: {}", file_path.display(), e));
                            } else {
                                result.games_added += 1;
                            }
                        }
                        Err(e) => {
                            result.errors.push(format!("Database error for {}: {}", file_path.display(), e));
                        }
                    }
                }
            }
        }
    }

    Ok(result)
}

/// Detect platform from folder path using hints
fn detect_platform_from_path(path: &str, hints: &[(&str, Vec<&str>)]) -> Option<String> {
    let path_lower = path.to_lowercase();

    for (platform_id, keywords) in hints {
        for keyword in keywords {
            // Check if any path component matches the keyword
            if path_lower.split(['/', '\\']).any(|part| {
                part == *keyword ||
                part.contains(&format!("{} ", keyword)) ||
                part.contains(&format!(" {}", keyword)) ||
                part.starts_with(&format!("{}_", keyword)) ||
                part.ends_with(&format!("_{}", keyword))
            }) {
                return Some(platform_id.to_string());
            }
        }
    }

    None
}

/// Clean up common ROM naming patterns
fn clean_rom_title(title: &str) -> String {
    let mut clean = title.to_string();

    // Remove common ROM tags like (USA), [!], (Rev A), etc.
    let patterns = [
        r"\s*\([^)]*\)",      // (anything)
        r"\s*\[[^\]]*\]",     // [anything]
        r"\s*\{[^}]*\}",      // {anything}
    ];

    for pattern in patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            clean = re.replace_all(&clean, "").to_string();
        }
    }

    // Trim and clean up multiple spaces
    clean.split_whitespace().collect::<Vec<_>>().join(" ")
}

// ==================== EMULATOR LAUNCH ====================

#[tauri::command]
pub fn launch_game(game_id: String, state: State<AppState>) -> Result<LaunchResult, String> {
    // Get the game
    let game = state.db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Game not found".to_string())?;

    // Get the emulator (prefer game's preferred, then platform default)
    let emulator_id = game.preferred_emulator_id.clone()
        .or_else(|| {
            state.db.get_platform(&game.platform_id)
                .ok()
                .flatten()
                .and_then(|p| p.default_emulator_id)
        });

    let emulator_id = match emulator_id {
        Some(id) => id,
        None => return Ok(LaunchResult {
            success: false,
            pid: None,
            error: Some("No emulator configured for this game or platform".to_string()),
        }),
    };

    let emulator = state.db.get_emulator(&emulator_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Emulator not found".to_string())?;

    launch_game_with_emulator_internal(&game, &emulator, &state)
}

#[tauri::command]
pub fn launch_game_with_emulator(
    game_id: String,
    emulator_id: String,
    state: State<AppState>,
) -> Result<LaunchResult, String> {
    let game = state.db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Game not found".to_string())?;

    let emulator = state.db.get_emulator(&emulator_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Emulator not found".to_string())?;

    launch_game_with_emulator_internal(&game, &emulator, &state)
}

fn launch_game_with_emulator_internal(
    game: &Game,
    emulator: &Emulator,
    state: &State<AppState>,
) -> Result<LaunchResult, String> {
    // Build the command arguments
    let args = emulator.launch_arguments
        .replace("{rom}", &game.rom_path)
        .replace("{title}", &game.title);

    // Parse arguments (simple split by whitespace, doesn't handle quoted strings)
    let args: Vec<&str> = args.split_whitespace().collect();

    // Launch the emulator
    let result = Command::new(&emulator.executable_path)
        .args(&args)
        .spawn();

    match result {
        Ok(child) => {
            let pid = child.id();

            // Start tracking the session
            let session = PlaySession::new(game.id.clone());
            if let Err(e) = state.db.create_play_session(&session) {
                eprintln!("Failed to create play session: {}", e);
            }

            // Store active session
            {
                let mut sessions = state.active_sessions.lock().unwrap();
                sessions.insert(game.id.clone(), ActiveSession {
                    session_id: session.id,
                    game_id: game.id.clone(),
                    start_time: chrono::Utc::now(),
                    pid: Some(pid),
                });
            }

            Ok(LaunchResult {
                success: true,
                pid: Some(pid),
                error: None,
            })
        }
        Err(e) => Ok(LaunchResult {
            success: false,
            pid: None,
            error: Some(e.to_string()),
        }),
    }
}

#[tauri::command]
pub fn end_game_session(game_id: String, state: State<AppState>) -> Result<(), String> {
    let mut sessions = state.active_sessions.lock().unwrap();

    if let Some(session) = sessions.remove(&game_id) {
        let end_time = chrono::Utc::now();
        let duration = (end_time - session.start_time).num_seconds();

        // End the play session
        state.db.end_play_session(
            &session.session_id,
            &end_time.to_rfc3339(),
            duration,
        ).map_err(|e| e.to_string())?;

        // Update game's total play time
        state.db.update_game_play_time(&game_id, duration).map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ==================== PLAY SESSION COMMANDS ====================

#[tauri::command]
pub fn get_play_sessions(game_id: String, state: State<AppState>) -> Result<Vec<PlaySession>, String> {
    state.db.get_play_sessions(&game_id).map_err(|e| e.to_string())
}

// ==================== UTILITY COMMANDS ====================

#[tauri::command]
pub fn validate_emulator_path(path: String) -> Result<bool, String> {
    let path = Path::new(&path);
    Ok(path.exists() && path.is_file())
}

#[tauri::command]
pub fn get_rom_info(rom_path: String, state: State<AppState>) -> Result<Option<(String, String)>, String> {
    let path = Path::new(&rom_path);

    if !path.exists() {
        return Ok(None);
    }

    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| format!(".{}", e.to_lowercase()));

    if extension.is_none() {
        return Ok(None);
    }

    let ext = extension.unwrap();
    let platforms = state.db.get_all_platforms().map_err(|e| e.to_string())?;

    for platform in platforms {
        if platform.file_extensions.iter().any(|e| e.to_lowercase() == ext) {
            let title = path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Unknown")
                .to_string();

            return Ok(Some((clean_rom_title(&title), platform.id)));
        }
    }

    Ok(None)
}

// ==================== SETTINGS COMMANDS ====================

#[tauri::command]
pub fn get_setting(key: String, state: State<AppState>) -> Result<Option<String>, String> {
    state.db.get_setting(&key).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(key: String, value: String, state: State<AppState>) -> Result<(), String> {
    state.db.set_setting(&key, &value).map_err(|e| e.to_string())
}
