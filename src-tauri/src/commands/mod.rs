use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Mutex;
use tauri::{Manager, State};
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

/// Set custom cover art for a game by copying the source image to app data
#[tauri::command]
pub fn set_custom_cover_art(
    game_id: String,
    source_path: String,
    app_handle: tauri::AppHandle,
    state: State<AppState>,
) -> Result<String, String> {
    // Verify the source file exists
    let source = Path::new(&source_path);
    if !source.exists() {
        return Err("Source image file does not exist".to_string());
    }

    // Get the file extension
    let extension = source
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_else(|| "jpg".to_string());

    // Validate it's an image format we support
    let valid_extensions = ["jpg", "jpeg", "png", "webp", "gif"];
    if !valid_extensions.contains(&extension.as_str()) {
        return Err(format!(
            "Unsupported image format '{}'. Supported formats: {}",
            extension,
            valid_extensions.join(", ")
        ));
    }

    // Get app data directory for images
    let app_data_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let covers_dir = app_data_dir.join("images").join("covers");

    // Create directory if it doesn't exist
    std::fs::create_dir_all(&covers_dir)
        .map_err(|e| format!("Failed to create covers directory: {}", e))?;

    // Destination path - use game ID and original extension
    let dest_path = covers_dir.join(format!("{}.{}", game_id, extension));

    // Copy the file
    std::fs::copy(&source, &dest_path)
        .map_err(|e| format!("Failed to copy image: {}", e))?;

    let dest_path_str = dest_path.to_string_lossy().to_string();

    // Update the game's cover_art_path in the database
    let updates = crate::models::UpdateGameInput {
        cover_art_path: Some(dest_path_str.clone()),
        ..Default::default()
    };

    state.db.update_game(&game_id, &updates)
        .map_err(|e| format!("Failed to update game: {}", e))?;

    Ok(dest_path_str)
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

/// Info about a discovered file during scanning
struct DiscoveredFile {
    path: PathBuf,
    extension: String,
    platform_id: String,
    disc_number: Option<u32>,
    base_name: String,
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

    // Also add .m3u as a valid extension for disc-based platforms
    for platform_id in ["ps1", "ps2", "saturn", "dreamcast", "segacd", "pce", "3do"] {
        ext_to_platforms
            .entry(".m3u".to_string())
            .or_default()
            .push(platform_id.to_string());
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

        // ============ PHASE 1: Collect all files ============
        let mut discovered_files: Vec<DiscoveredFile> = Vec::new();
        let mut existing_m3u_files: std::collections::HashSet<PathBuf> = std::collections::HashSet::new();

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
                // Track existing .m3u files
                if ext == ".m3u" {
                    existing_m3u_files.insert(file_path.to_path_buf());
                }

                // Skip .bin files if any .cue file exists in the same directory
                if ext == ".bin" {
                    if let Some(parent) = file_path.parent() {
                        let has_cue_file = std::fs::read_dir(parent)
                            .map(|entries| {
                                entries.filter_map(|e| e.ok()).any(|e| {
                                    e.path()
                                        .extension()
                                        .and_then(|ext| ext.to_str())
                                        .map(|ext| ext.eq_ignore_ascii_case("cue"))
                                        .unwrap_or(false)
                                })
                            })
                            .unwrap_or(false);

                        if has_cue_file {
                            continue;
                        }
                    }
                }

                if let Some(possible_platforms) = ext_to_platforms.get(&ext) {
                    let rom_path_str = file_path.canonicalize()
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_else(|_| file_path.to_string_lossy().to_string());

                    let platform_id = if let Some(ref override_id) = scan_path.platform_id {
                        override_id.clone()
                    } else if possible_platforms.len() == 1 {
                        possible_platforms[0].clone()
                    } else {
                        detect_platform_from_path(&rom_path_str, &platform_hints)
                            .filter(|detected| possible_platforms.contains(detected))
                            .unwrap_or_else(|| possible_platforms[0].clone())
                    };

                    let file_stem = file_path.file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("Unknown")
                        .to_string();

                    let is_disc = is_disc_extension(&ext);
                    let disc_number = if is_disc { get_disc_number(&file_stem) } else { None };
                    let base_name = if disc_number.is_some() {
                        get_base_game_name(&file_stem)
                    } else {
                        file_stem.clone()
                    };

                    discovered_files.push(DiscoveredFile {
                        path: file_path.to_path_buf(),
                        extension: ext,
                        platform_id,
                        disc_number,
                        base_name,
                    });
                }
            }
        }

        // ============ PHASE 2: Detect and generate .m3u for multi-disc games ============
        // Group disc files by directory + base name
        let mut multi_disc_groups: HashMap<(PathBuf, String), Vec<(u32, PathBuf)>> = HashMap::new();

        for file in &discovered_files {
            if let Some(disc_num) = file.disc_number {
                if let Some(parent) = file.path.parent() {
                    let key = (parent.to_path_buf(), file.base_name.clone());
                    multi_disc_groups.entry(key)
                        .or_default()
                        .push((disc_num, file.path.clone()));
                }
            }
        }

        // Generate .m3u files for multi-disc games (only if more than 1 disc)
        let mut generated_m3u_files: std::collections::HashSet<PathBuf> = std::collections::HashSet::new();

        for ((dir, base_name), discs) in &multi_disc_groups {
            if discs.len() > 1 {
                // Check if an .m3u already exists for this game
                let potential_m3u = dir.join(format!("{}.m3u", base_name));
                if !existing_m3u_files.contains(&potential_m3u) {
                    // Generate new .m3u file
                    match generate_m3u_playlist(base_name, discs, dir) {
                        Ok(m3u_path) => {
                            println!("Generated .m3u playlist: {}", m3u_path.display());
                            generated_m3u_files.insert(m3u_path);
                        }
                        Err(e) => {
                            result.errors.push(format!("Failed to generate .m3u for {}: {}", base_name, e));
                        }
                    }
                } else {
                    // .m3u already exists, we'll use it
                    generated_m3u_files.insert(potential_m3u);
                }
            }
        }

        // Build set of disc files that are covered by .m3u files
        let mut covered_disc_files: std::collections::HashSet<PathBuf> = std::collections::HashSet::new();
        for ((_dir, _base_name), discs) in &multi_disc_groups {
            if discs.len() > 1 {
                // These disc files should be skipped since they're in a multi-disc set
                for (_, disc_path) in discs {
                    covered_disc_files.insert(disc_path.clone());
                }
            }
        }

        // ============ PHASE 3: Import games ============
        for file in &discovered_files {
            // Skip individual disc files that are covered by .m3u
            if covered_disc_files.contains(&file.path) {
                continue;
            }

            // Skip .m3u files we didn't generate (they might already be in library)
            // But include ones we just generated
            if file.extension == ".m3u" && !generated_m3u_files.contains(&file.path) {
                // Check if this existing .m3u should be imported
                // Only if not already in library
            }

            result.games_found += 1;

            let rom_path = file.path.canonicalize()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| file.path.to_string_lossy().to_string());

            // Check if game already exists
            match state.db.get_game_by_path(&rom_path) {
                Ok(Some(_)) => {
                    result.games_updated += 1;
                }
                Ok(None) => {
                    let title = clean_rom_title(&file.base_name);
                    let game = Game::new(title, rom_path, file.platform_id.clone());

                    if let Err(e) = state.db.add_game(&game) {
                        result.errors.push(format!("Failed to add {}: {}", file.path.display(), e));
                    } else {
                        result.games_added += 1;
                    }
                }
                Err(e) => {
                    result.errors.push(format!("Database error for {}: {}", file.path.display(), e));
                }
            }
        }

        // Also import the generated .m3u files
        for m3u_path in &generated_m3u_files {
            let rom_path = m3u_path.canonicalize()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_else(|_| m3u_path.to_string_lossy().to_string());

            // Determine platform from directory
            let platform_id = detect_platform_from_path(&rom_path, &platform_hints)
                .unwrap_or_else(|| "ps1".to_string()); // Default to PS1 for .m3u files

            match state.db.get_game_by_path(&rom_path) {
                Ok(Some(_)) => {
                    result.games_updated += 1;
                }
                Ok(None) => {
                    let title = m3u_path.file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("Unknown")
                        .to_string();
                    let title = clean_rom_title(&title);

                    let game = Game::new(title, rom_path, platform_id);

                    if let Err(e) = state.db.add_game(&game) {
                        result.errors.push(format!("Failed to add {}: {}", m3u_path.display(), e));
                    } else {
                        result.games_added += 1;
                        result.games_found += 1;
                    }
                }
                Err(e) => {
                    result.errors.push(format!("Database error for {}: {}", m3u_path.display(), e));
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

/// Check if a filename indicates it's part of a multi-disc set
/// Returns the disc number if found
fn get_disc_number(filename: &str) -> Option<u32> {
    let filename_lower = filename.to_lowercase();

    // Patterns to match disc indicators
    let patterns = [
        r"[\(\[]\s*disc\s*(\d+)(?:\s*of\s*\d+)?[\)\]]",  // (Disc 1), [Disc 2], (Disc 1 of 3)
        r"[\(\[]\s*disk\s*(\d+)(?:\s*of\s*\d+)?[\)\]]",  // (Disk 1), [Disk 2]
        r"[\(\[]\s*cd\s*(\d+)[\)\]]",                     // (CD1), [CD2]
        r"\s*-\s*disc\s*(\d+)",                           // - Disc 1
        r"\s*-\s*disk\s*(\d+)",                           // - Disk 1
        r"\s*-\s*cd\s*(\d+)",                             // - CD1
        r"\s+disc\s*(\d+)$",                              // Game Disc 1
        r"\s+disk\s*(\d+)$",                              // Game Disk 1
        r"\s+cd\s*(\d+)$",                                // Game CD1
        r"_disc(\d+)",                                    // Game_Disc1
        r"_cd(\d+)",                                      // Game_CD1
    ];

    for pattern in patterns {
        if let Ok(re) = regex::Regex::new(&format!("(?i){}", pattern)) {
            if let Some(caps) = re.captures(&filename_lower) {
                if let Some(num_match) = caps.get(1) {
                    if let Ok(num) = num_match.as_str().parse::<u32>() {
                        return Some(num);
                    }
                }
            }
        }
    }

    None
}

/// Extract the base game name from a multi-disc filename
/// Removes disc indicators to get the common name
fn get_base_game_name(filename: &str) -> String {
    let mut result = filename.to_string();

    // Patterns to remove disc indicators
    let patterns = [
        r"(?i)[\(\[]\s*disc\s*\d+(?:\s*of\s*\d+)?[\)\]]",
        r"(?i)[\(\[]\s*disk\s*\d+(?:\s*of\s*\d+)?[\)\]]",
        r"(?i)[\(\[]\s*cd\s*\d+[\)\]]",
        r"(?i)\s*-\s*disc\s*\d+",
        r"(?i)\s*-\s*disk\s*\d+",
        r"(?i)\s*-\s*cd\s*\d+",
        r"(?i)\s+disc\s*\d+$",
        r"(?i)\s+disk\s*\d+$",
        r"(?i)\s+cd\s*\d+$",
        r"(?i)_disc\d+",
        r"(?i)_cd\d+",
    ];

    for pattern in patterns {
        if let Ok(re) = regex::Regex::new(pattern) {
            result = re.replace_all(&result, "").to_string();
        }
    }

    result.trim().to_string()
}

/// Disc-based file extensions that could be multi-disc games
fn is_disc_extension(ext: &str) -> bool {
    matches!(ext, ".cue" | ".iso" | ".chd" | ".mdf" | ".nrg" | ".img" | ".ccd")
}

/// Generate an .m3u playlist file for a multi-disc game
fn generate_m3u_playlist(
    base_name: &str,
    discs: &[(u32, PathBuf)],  // (disc_number, file_path)
    output_dir: &Path,
) -> Result<PathBuf, String> {
    // Sort discs by disc number
    let mut sorted_discs: Vec<_> = discs.to_vec();
    sorted_discs.sort_by_key(|(num, _)| *num);

    // Create the .m3u filename
    let m3u_filename = format!("{}.m3u", base_name);
    let m3u_path = output_dir.join(&m3u_filename);

    // Generate playlist content with relative paths
    let content: String = sorted_discs
        .iter()
        .filter_map(|(_, path)| {
            path.file_name()
                .and_then(|n| n.to_str())
                .map(|s| s.to_string())
        })
        .collect::<Vec<_>>()
        .join("\n");

    // Write the .m3u file
    std::fs::write(&m3u_path, content)
        .map_err(|e| format!("Failed to write .m3u file: {}", e))?;

    Ok(m3u_path)
}

// ==================== EMULATOR LAUNCH ====================

/// Get the actual executable path, handling macOS .app bundles
fn get_executable_path(path: &str) -> Result<String, String> {
    let path = Path::new(path);

    // Check if this is a macOS .app bundle
    #[cfg(target_os = "macos")]
    {
        if path.is_dir() {
            if let Some(ext) = path.extension() {
                if ext == "app" {
                    // Look for the executable inside the bundle
                    // Standard location: AppName.app/Contents/MacOS/AppName
                    let macos_dir = path.join("Contents").join("MacOS");

                    if macos_dir.exists() {
                        // Try to find the executable - usually same name as the app
                        let app_name = path.file_stem()
                            .and_then(|s| s.to_str())
                            .unwrap_or("unknown");

                        let executable = macos_dir.join(app_name);
                        if executable.exists() {
                            return Ok(executable.to_string_lossy().to_string());
                        }

                        // If not found by name, look for any executable in the MacOS folder
                        if let Ok(entries) = std::fs::read_dir(&macos_dir) {
                            for entry in entries.filter_map(|e| e.ok()) {
                                let entry_path = entry.path();
                                if entry_path.is_file() {
                                    // Check if it's executable
                                    #[cfg(unix)]
                                    {
                                        use std::os::unix::fs::PermissionsExt;
                                        if let Ok(metadata) = entry_path.metadata() {
                                            if metadata.permissions().mode() & 0o111 != 0 {
                                                return Ok(entry_path.to_string_lossy().to_string());
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        return Err(format!("Could not find executable in app bundle: {}", path.display()));
                    }
                }
            }
        }
    }

    // Not a .app bundle or not on macOS, return as-is
    Ok(path.to_string_lossy().to_string())
}

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
    // Ensure ROM path is absolute (fixes Windows path resolution issues)
    let rom_path = std::path::Path::new(&game.rom_path);
    let absolute_rom_path = if rom_path.is_absolute() {
        game.rom_path.clone()
    } else {
        rom_path.canonicalize()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_else(|_| game.rom_path.clone())
    };

    // On Windows, escape backslashes so shell_words doesn't interpret them as escape chars
    #[cfg(target_os = "windows")]
    let absolute_rom_path = absolute_rom_path.replace("\\", "\\\\");

    #[cfg(target_os = "windows")]
    let game_title = game.title.replace("\\", "\\\\");
    #[cfg(not(target_os = "windows"))]
    let game_title = game.title.clone();

    // Build the command arguments
    let args_template = emulator.launch_arguments
        .replace("{rom}", &absolute_rom_path)
        .replace("{title}", &game_title);

    // Parse arguments properly handling quoted strings
    let args: Vec<String> = match shell_words::split(&args_template) {
        Ok(args) => args,
        Err(e) => return Ok(LaunchResult {
            success: false,
            pid: None,
            error: Some(format!("Failed to parse launch arguments: {}", e)),
        }),
    };

    // Determine the actual executable path
    let executable_path = get_executable_path(&emulator.executable_path)?;

    // Launch the emulator
    let result = Command::new(&executable_path)
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

    if !path.exists() {
        return Ok(false);
    }

    // On macOS, .app bundles are directories, not files
    #[cfg(target_os = "macos")]
    {
        // Accept .app bundles (directories) or regular executable files
        if path.is_dir() {
            // Check if it's a .app bundle
            if let Some(ext) = path.extension() {
                if ext == "app" {
                    return Ok(true);
                }
            }
            return Ok(false);
        }
        return Ok(path.is_file());
    }

    // On Windows and Linux, just check if it's a file
    #[cfg(not(target_os = "macos"))]
    {
        Ok(path.is_file())
    }
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

// ==================== RETROARCH COMMANDS ====================

/// Information about a RetroArch core
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RetroArchCore {
    pub file_name: String,
    pub display_name: String,
    pub full_path: String,
}

/// Get the default RetroArch cores folder path
#[tauri::command]
pub fn get_default_retroarch_cores_path() -> Result<Option<String>, String> {
    #[cfg(target_os = "macos")]
    {
        if let Some(home) = dirs::home_dir() {
            let cores_path = home.join("Library/Application Support/RetroArch/cores");
            if cores_path.exists() {
                return Ok(Some(cores_path.to_string_lossy().to_string()));
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        // Common Windows paths for RetroArch
        let possible_paths = [
            dirs::config_dir().map(|p| p.join("RetroArch/cores")),
            dirs::data_dir().map(|p| p.join("RetroArch/cores")),
            Some(std::path::PathBuf::from("C:/RetroArch/cores")),
        ];

        for path_opt in possible_paths.iter() {
            if let Some(path) = path_opt {
                if path.exists() {
                    return Ok(Some(path.to_string_lossy().to_string()));
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(home) = dirs::home_dir() {
            let cores_path = home.join(".config/retroarch/cores");
            if cores_path.exists() {
                return Ok(Some(cores_path.to_string_lossy().to_string()));
            }
        }
    }

    Ok(None)
}

/// Scan a folder for RetroArch cores
#[tauri::command]
pub fn scan_retroarch_cores(cores_path: String) -> Result<Vec<RetroArchCore>, String> {
    let path = Path::new(&cores_path);

    if !path.exists() || !path.is_dir() {
        return Err("Cores folder does not exist".to_string());
    }

    // Core file extension based on platform
    #[cfg(target_os = "macos")]
    let core_ext = "dylib";
    #[cfg(target_os = "windows")]
    let core_ext = "dll";
    #[cfg(target_os = "linux")]
    let core_ext = "so";

    let mut cores = Vec::new();

    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.filter_map(|e| e.ok()) {
            let file_path = entry.path();

            // Check if it's a core file (ends with _libretro.dylib/dll/so)
            if let Some(file_name) = file_path.file_name().and_then(|n| n.to_str()) {
                if file_name.ends_with(&format!("_libretro.{}", core_ext)) {
                    // Extract display name from file name
                    // e.g., "snes9x_libretro.dylib" -> "snes9x"
                    let display_name = file_name
                        .trim_end_matches(&format!("_libretro.{}", core_ext))
                        .replace('_', " ")
                        .split_whitespace()
                        .map(|word| {
                            let mut chars = word.chars();
                            match chars.next() {
                                Some(first) => first.to_uppercase().chain(chars).collect(),
                                None => String::new(),
                            }
                        })
                        .collect::<Vec<String>>()
                        .join(" ");

                    cores.push(RetroArchCore {
                        file_name: file_name.to_string(),
                        display_name,
                        full_path: file_path.to_string_lossy().to_string(),
                    });
                }
            }
        }
    }

    // Sort by display name
    cores.sort_by(|a, b| a.display_name.cmp(&b.display_name));

    Ok(cores)
}

// ==================== METADATA SCRAPING COMMANDS ====================

use crate::scraper::{IgdbClient, IgdbSearchResult, ScrapeResult, BatchScrapeResult};

/// Validate IGDB credentials
#[tauri::command]
pub async fn validate_igdb_credentials(client_id: String, client_secret: String) -> Result<bool, String> {
    let client = IgdbClient::new(client_id, client_secret);
    client.validate_credentials().await
}

/// Search IGDB for games matching a query
#[tauri::command]
pub async fn search_igdb(
    query: String,
    platform_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<IgdbSearchResult>, String> {
    // Get IGDB credentials from settings
    let client_id = state.db.get_setting("igdb_client_id")
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "IGDB Client ID not configured".to_string())?;
    let client_secret = state.db.get_setting("igdb_client_secret")
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "IGDB Client Secret not configured".to_string())?;

    let client = IgdbClient::new(client_id, client_secret);
    client.search_games(&query, platform_id.as_deref()).await
}

/// Scrape metadata for a single game
#[tauri::command]
pub async fn scrape_game_metadata(
    game_id: String,
    igdb_id: Option<u64>,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<ScrapeResult, String> {
    // Get the game
    let game = state.db.get_game(&game_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Game not found".to_string())?;

    // Get IGDB credentials
    let client_id = state.db.get_setting("igdb_client_id")
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "IGDB Client ID not configured".to_string())?;
    let client_secret = state.db.get_setting("igdb_client_secret")
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "IGDB Client Secret not configured".to_string())?;

    let client = IgdbClient::new(client_id, client_secret);

    // If no IGDB ID provided, search for the game
    let target_igdb_id = if let Some(id) = igdb_id {
        id
    } else {
        // Search for the game by title and platform
        let results = client.search_games(&game.title, Some(&game.platform_id)).await?;

        if results.is_empty() {
            // Try without platform filter
            let results = client.search_games(&game.title, None).await?;
            if results.is_empty() {
                return Ok(ScrapeResult {
                    success: false,
                    game_id: game_id.clone(),
                    fields_updated: vec![],
                    error: Some("No matching games found on IGDB".to_string()),
                });
            }
            results[0].igdb_id
        } else {
            results[0].igdb_id
        }
    };

    // Get full metadata
    let metadata = client.get_game_metadata(target_igdb_id).await?;

    // Get app data directory for images
    let app_data_dir = app_handle.path().app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;
    let images_dir = app_data_dir.join("images");

    let mut fields_updated = Vec::new();

    println!("Metadata cover_url: {:?}", metadata.cover_url);

    // Download cover art
    let cover_path = if let Some(ref url) = metadata.cover_url {
        let cover_dir = images_dir.join("covers");
        let cover_path = cover_dir.join(format!("{}.jpg", game_id));

        println!("Downloading cover to: {:?}", cover_path);

        if let Err(e) = client.download_image(url, &cover_path).await {
            eprintln!("Failed to download cover: {}", e);
            None
        } else {
            println!("Cover downloaded successfully");
            fields_updated.push("cover_art_path".to_string());
            Some(cover_path.to_string_lossy().to_string())
        }
    } else {
        println!("No cover URL in metadata");
        None
    };

    // Download screenshots
    let mut screenshot_paths = Vec::new();
    let screenshots_dir = images_dir.join("screenshots");

    for (i, url) in metadata.screenshot_urls.iter().enumerate() {
        let screenshot_path = screenshots_dir.join(format!("{}_{}.jpg", game_id, i));

        if let Err(e) = client.download_image(url, &screenshot_path).await {
            eprintln!("Failed to download screenshot {}: {}", i, e);
        } else {
            screenshot_paths.push(screenshot_path.to_string_lossy().to_string());
        }
    }

    if !screenshot_paths.is_empty() {
        fields_updated.push("screenshots".to_string());
    }

    // Build update input
    let mut updates = crate::models::UpdateGameInput::default();

    if let Some(cover) = cover_path {
        updates.cover_art_path = Some(cover);
    }

    if !screenshot_paths.is_empty() {
        updates.screenshots = Some(screenshot_paths);
    }

    if metadata.summary.is_some() {
        updates.description = metadata.summary;
        fields_updated.push("description".to_string());
    }

    if metadata.release_date.is_some() {
        updates.release_date = metadata.release_date;
        fields_updated.push("release_date".to_string());
    }

    if !metadata.genres.is_empty() {
        updates.genre = Some(metadata.genres);
        fields_updated.push("genre".to_string());
    }

    if metadata.developer.is_some() {
        updates.developer = metadata.developer;
        fields_updated.push("developer".to_string());
    }

    if metadata.publisher.is_some() {
        updates.publisher = metadata.publisher;
        fields_updated.push("publisher".to_string());
    }

    // Update the game in the database
    state.db.update_game(&game_id, &updates)
        .map_err(|e| e.to_string())?;

    Ok(ScrapeResult {
        success: true,
        game_id,
        fields_updated,
        error: None,
    })
}

/// Batch scrape metadata for all games (or only those missing metadata)
#[tauri::command]
pub async fn scrape_library_metadata(
    only_missing: bool,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<BatchScrapeResult, String> {
    // Get all games
    let games = state.db.get_all_games().map_err(|e| e.to_string())?;

    let mut total = 0u32;
    let mut successful = 0u32;
    let mut failed = 0u32;
    let mut errors = Vec::new();

    for game in games {
        // Skip games that already have metadata if only_missing is true
        if only_missing && game.cover_art_path.is_some() {
            continue;
        }

        total += 1;

        // Rate limiting - IGDB allows 4 requests/second, be conservative
        tokio::time::sleep(tokio::time::Duration::from_millis(300)).await;

        match scrape_game_metadata(
            game.id.clone(),
            None,
            app_handle.clone(),
            state.clone(),
        ).await {
            Ok(result) => {
                if result.success {
                    successful += 1;
                } else {
                    failed += 1;
                    if let Some(err) = result.error {
                        errors.push(format!("{}: {}", game.title, err));
                    }
                }
            }
            Err(e) => {
                failed += 1;
                errors.push(format!("{}: {}", game.title, e));
            }
        }
    }

    Ok(BatchScrapeResult {
        total,
        successful,
        failed,
        errors,
    })
}
