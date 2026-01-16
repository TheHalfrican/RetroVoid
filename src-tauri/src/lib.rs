use std::collections::HashMap;
use std::sync::Mutex;
use tauri::Manager;

mod commands;
mod db;
mod models;
mod scraper;

use commands::AppState;
use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Get the app data directory for the database
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");

            let db_path = app_data_dir.join("retrovoid.db");
            println!("Database path: {:?}", db_path);

            // Initialize the database
            let db = Database::new(db_path).expect("Failed to initialize database");

            // Create app state
            let state = AppState {
                db,
                active_sessions: Mutex::new(HashMap::new()),
            };

            // Manage state
            app.manage(state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Game commands
            commands::get_all_games,
            commands::get_game,
            commands::add_game,
            commands::update_game,
            commands::delete_game,
            commands::delete_games_batch,
            commands::toggle_favorite,
            commands::set_custom_cover_art,
            // Emulator commands
            commands::get_all_emulators,
            commands::get_emulator,
            commands::add_emulator,
            commands::update_emulator,
            commands::delete_emulator,
            // Platform commands
            commands::get_all_platforms,
            commands::get_platform,
            commands::set_default_emulator,
            // Collection commands
            commands::get_all_collections,
            commands::add_collection,
            commands::update_collection,
            commands::delete_collection,
            // Library scanning
            commands::scan_library,
            // Launch commands
            commands::launch_game,
            commands::launch_game_with_emulator,
            commands::end_game_session,
            // Play session commands
            commands::get_play_sessions,
            // Utility commands
            commands::validate_emulator_path,
            commands::get_rom_info,
            // Settings commands
            commands::get_setting,
            commands::set_setting,
            // RetroArch commands
            commands::get_default_retroarch_cores_path,
            commands::scan_retroarch_cores,
            // Scraping commands
            commands::validate_igdb_credentials,
            commands::search_igdb,
            commands::scrape_game_metadata,
            commands::scrape_library_metadata,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
