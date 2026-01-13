use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Represents a game in the library
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub id: String,
    pub title: String,
    pub rom_path: String,
    pub platform_id: String,
    pub cover_art_path: Option<String>,
    pub background_path: Option<String>,
    pub screenshots: Vec<String>,
    pub description: Option<String>,
    pub release_date: Option<String>,
    pub genre: Vec<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub total_play_time_seconds: i64,
    pub last_played: Option<String>,
    pub is_favorite: bool,
    pub preferred_emulator_id: Option<String>,
    pub collection_ids: Vec<String>,
}

impl Game {
    pub fn new(title: String, rom_path: String, platform_id: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            title,
            rom_path,
            platform_id,
            cover_art_path: None,
            background_path: None,
            screenshots: Vec::new(),
            description: None,
            release_date: None,
            genre: Vec::new(),
            developer: None,
            publisher: None,
            total_play_time_seconds: 0,
            last_played: None,
            is_favorite: false,
            preferred_emulator_id: None,
            collection_ids: Vec::new(),
        }
    }
}

/// Represents an emulator configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Emulator {
    pub id: String,
    pub name: String,
    pub executable_path: String,
    pub launch_arguments: String,
    pub supported_platform_ids: Vec<String>,
}

impl Emulator {
    pub fn new(name: String, executable_path: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            executable_path,
            launch_arguments: String::from("{rom}"),
            supported_platform_ids: Vec::new(),
        }
    }
}

/// Represents a gaming platform
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Platform {
    pub id: String,
    pub display_name: String,
    pub manufacturer: String,
    pub file_extensions: Vec<String>,
    pub icon_path: Option<String>,
    pub default_emulator_id: Option<String>,
    pub color: String,
}

/// Represents a user-created collection of games
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub game_ids: Vec<String>,
    pub cover_game_id: Option<String>,
}

impl Collection {
    pub fn new(name: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            game_ids: Vec::new(),
            cover_game_id: None,
        }
    }
}

/// Represents a gaming session for play time tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaySession {
    pub id: String,
    pub game_id: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub duration_seconds: i64,
}

impl PlaySession {
    pub fn new(game_id: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            game_id,
            start_time: chrono::Utc::now().to_rfc3339(),
            end_time: None,
            duration_seconds: 0,
        }
    }
}

/// Result of launching a game
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchResult {
    pub success: bool,
    pub pid: Option<u32>,
    pub error: Option<String>,
}

/// Input for creating a new game
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateGameInput {
    pub title: String,
    pub rom_path: String,
    pub platform_id: String,
    pub cover_art_path: Option<String>,
    pub description: Option<String>,
}

/// Input for updating a game
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateGameInput {
    pub title: Option<String>,
    pub platform_id: Option<String>,
    pub cover_art_path: Option<String>,
    pub background_path: Option<String>,
    pub screenshots: Option<Vec<String>>,
    pub description: Option<String>,
    pub release_date: Option<String>,
    pub genre: Option<Vec<String>>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub is_favorite: Option<bool>,
    pub preferred_emulator_id: Option<String>,
}

/// Input for creating an emulator
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEmulatorInput {
    pub name: String,
    pub executable_path: String,
    pub launch_arguments: Option<String>,
    pub supported_platform_ids: Vec<String>,
}

/// Input for updating an emulator
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEmulatorInput {
    pub name: Option<String>,
    pub executable_path: Option<String>,
    pub launch_arguments: Option<String>,
    pub supported_platform_ids: Option<Vec<String>>,
}

/// Input for creating a collection
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateCollectionInput {
    pub name: String,
}

/// Input for updating a collection
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCollectionInput {
    pub name: Option<String>,
    pub game_ids: Option<Vec<String>>,
    pub cover_game_id: Option<String>,
}

/// Scan result from library scanning
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub games_found: i32,
    pub games_added: i32,
    pub games_updated: i32,
    pub errors: Vec<String>,
}
