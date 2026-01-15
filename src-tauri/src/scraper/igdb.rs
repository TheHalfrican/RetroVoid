use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// IGDB API client with OAuth token management
pub struct IgdbClient {
    client: Client,
    client_id: String,
    client_secret: String,
    token: Mutex<Option<TokenData>>,
}

struct TokenData {
    access_token: String,
    expires_at: Instant,
}

/// Search result from IGDB
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IgdbSearchResult {
    pub igdb_id: u64,
    pub name: String,
    pub release_date: Option<String>,
    pub cover_url: Option<String>,
    pub platforms: Vec<String>,
    pub summary: Option<String>,
}

/// Full game metadata from IGDB
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IgdbGameMetadata {
    pub igdb_id: u64,
    pub name: String,
    pub summary: Option<String>,
    pub release_date: Option<String>,
    pub genres: Vec<String>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub cover_url: Option<String>,
    pub screenshot_urls: Vec<String>,
}

/// Result of a scrape operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScrapeResult {
    pub success: bool,
    pub game_id: String,
    pub fields_updated: Vec<String>,
    pub error: Option<String>,
}

/// Result of batch scraping
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchScrapeResult {
    pub total: u32,
    pub successful: u32,
    pub failed: u32,
    pub errors: Vec<String>,
}

// OAuth token response from Twitch
#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: u64,
}

// IGDB API response types
#[derive(Debug, Deserialize)]
struct IgdbGame {
    id: u64,
    name: String,
    summary: Option<String>,
    first_release_date: Option<i64>,
    cover: Option<IgdbCover>,
    screenshots: Option<Vec<IgdbScreenshot>>,
    genres: Option<Vec<IgdbGenre>>,
    involved_companies: Option<Vec<IgdbInvolvedCompany>>,
    platforms: Option<Vec<IgdbPlatform>>,
}

#[derive(Debug, Deserialize)]
struct IgdbCover {
    image_id: String,
}

#[derive(Debug, Deserialize)]
struct IgdbScreenshot {
    image_id: String,
}

#[derive(Debug, Deserialize)]
struct IgdbGenre {
    name: String,
}

#[derive(Debug, Deserialize)]
struct IgdbInvolvedCompany {
    company: IgdbCompany,
    developer: bool,
    publisher: bool,
}

#[derive(Debug, Deserialize)]
struct IgdbCompany {
    name: String,
}

#[derive(Debug, Deserialize)]
struct IgdbPlatform {
    name: String,
}

/// Platform ID mapping from our IDs to IGDB platform IDs
/// IGDB platform reference: https://api-docs.igdb.com/#platform
pub fn get_igdb_platform_id(platform_id: &str) -> Option<u64> {
    let mapping: HashMap<&str, u64> = [
        // Nintendo
        ("nes", 18),           // Nintendo Entertainment System
        ("famicom", 99),       // Family Computer Disk System
        ("snes", 19),          // Super Nintendo
        ("n64", 4),            // Nintendo 64
        ("gamecube", 21),      // GameCube
        ("wii", 5),            // Wii
        ("wiiu", 41),          // Wii U
        ("switch", 130),       // Nintendo Switch
        ("gb", 33),            // Game Boy
        ("gbc", 22),           // Game Boy Color
        ("gba", 24),           // Game Boy Advance
        ("nds", 20),           // Nintendo DS
        ("3ds", 37),           // Nintendo 3DS
        ("virtualboy", 87),    // Virtual Boy
        // Sony
        ("ps1", 7),            // PlayStation
        ("ps2", 8),            // PlayStation 2
        ("ps3", 9),            // PlayStation 3
        ("ps4", 48),           // PlayStation 4
        ("psp", 38),           // PlayStation Portable
        ("vita", 46),          // PlayStation Vita
        // Sega
        ("genesis", 29),       // Sega Genesis / Mega Drive
        ("megadrive", 29),     // Alias for Genesis
        ("sms", 64),           // Sega Master System
        ("gamegear", 35),      // Game Gear
        ("saturn", 32),        // Sega Saturn
        ("dreamcast", 23),     // Dreamcast
        ("segacd", 78),        // Sega CD
        ("32x", 30),           // Sega 32X
        // Microsoft
        ("xbox", 11),          // Xbox
        ("xbox360", 12),       // Xbox 360
        ("xboxone", 49),       // Xbox One
        // Atari
        ("atari2600", 59),     // Atari 2600
        ("atari7800", 60),     // Atari 7800
        ("atarijaguar", 62),   // Atari Jaguar
        ("atarilynx", 61),     // Atari Lynx
        // SNK
        ("neogeo", 80),        // Neo Geo AES
        ("neogeocd", 136),     // Neo Geo CD
        ("ngp", 119),          // Neo Geo Pocket
        ("ngpc", 120),         // Neo Geo Pocket Color
        // NEC
        ("pce", 86),           // PC Engine / TurboGrafx-16
        ("tg16", 86),          // TurboGrafx-16 (alias)
        ("pcfx", 274),         // PC-FX
        // Other
        ("arcade", 52),        // Arcade
        ("dos", 13),           // DOS
        ("pc", 6),             // PC (Windows)
        ("3do", 50),           // 3DO
        ("wonderswan", 57),    // WonderSwan
        ("wonderswancolor", 123), // WonderSwan Color
        ("msx", 27),           // MSX
        ("msx2", 53),          // MSX2
        ("coleco", 68),        // ColecoVision
        ("intellivision", 67), // Intellivision
    ].into_iter().collect();

    mapping.get(platform_id).copied()
}

impl IgdbClient {
    /// Create a new IGDB client
    pub fn new(client_id: String, client_secret: String) -> Self {
        Self {
            client: Client::new(),
            client_id,
            client_secret,
            token: Mutex::new(None),
        }
    }

    /// Get a valid access token, refreshing if necessary
    async fn get_token(&self) -> Result<String, String> {
        // Check if we have a valid cached token
        {
            let token_guard = self.token.lock().unwrap();
            if let Some(ref token_data) = *token_guard {
                if token_data.expires_at > Instant::now() {
                    return Ok(token_data.access_token.clone());
                }
            }
        }

        // Need to fetch a new token
        let response = self.client
            .post("https://id.twitch.tv/oauth2/token")
            .form(&[
                ("client_id", self.client_id.as_str()),
                ("client_secret", self.client_secret.as_str()),
                ("grant_type", "client_credentials"),
            ])
            .send()
            .await
            .map_err(|e| format!("Failed to request token: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(format!("Token request failed ({}): {}", status, text));
        }

        let token_response: TokenResponse = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse token response: {}", e))?;

        // Cache the token with expiration (subtract 60 seconds for safety margin)
        let expires_at = Instant::now() + Duration::from_secs(token_response.expires_in.saturating_sub(60));
        let access_token = token_response.access_token.clone();

        {
            let mut token_guard = self.token.lock().unwrap();
            *token_guard = Some(TokenData {
                access_token: token_response.access_token,
                expires_at,
            });
        }

        Ok(access_token)
    }

    /// Validate credentials by attempting to get a token
    pub async fn validate_credentials(&self) -> Result<bool, String> {
        match self.get_token().await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// Search for games by name and optionally filter by platform
    pub async fn search_games(&self, query: &str, platform_id: Option<&str>) -> Result<Vec<IgdbSearchResult>, String> {
        let token = self.get_token().await?;

        // Escape the query for IGDB
        let escaped_query = query.replace("\"", "\\\"");

        // Get the IGDB platform ID if we have a platform filter
        let igdb_platform_id = platform_id.and_then(get_igdb_platform_id);

        // Build query - if we have a platform, filter by it
        let body = if let Some(plat_id) = igdb_platform_id {
            format!(
                "search \"{}\"; fields name, summary, first_release_date, cover.image_id, platforms.name, platforms; where platforms = ({}); limit 20;",
                escaped_query, plat_id
            )
        } else {
            format!(
                "search \"{}\"; fields name, summary, first_release_date, cover.image_id, platforms.name, platforms; limit 20;",
                escaped_query
            )
        };

        let response = self.client
            .post("https://api.igdb.com/v4/games")
            .header("Client-ID", &self.client_id)
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "text/plain")
            .header("Accept", "application/json")
            .body(body)
            .send()
            .await
            .map_err(|e| format!("IGDB request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(format!("IGDB search failed ({}): {}", status, text));
        }

        let games: Vec<IgdbGame> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse IGDB response: {}", e))?;

        println!("IGDB search for '{}' (platform: {:?}) found {} results", query, platform_id, games.len());

        // Convert to our search result format
        let mut results: Vec<IgdbSearchResult> = games
            .into_iter()
            .map(|game| {
                let release_date = game.first_release_date.map(|ts| {
                    chrono::DateTime::from_timestamp(ts, 0)
                        .map(|dt| dt.format("%Y-%m-%d").to_string())
                        .unwrap_or_default()
                });

                let cover_url = game.cover.map(|c| {
                    format!("https://images.igdb.com/igdb/image/upload/t_cover_big/{}.jpg", c.image_id)
                });

                let platforms = game.platforms
                    .unwrap_or_default()
                    .into_iter()
                    .map(|p| p.name)
                    .collect();

                IgdbSearchResult {
                    igdb_id: game.id,
                    name: game.name,
                    release_date,
                    cover_url,
                    platforms,
                    summary: game.summary,
                }
            })
            .collect();

        // Sort results to prioritize exact name matches and earlier release dates
        let query_lower = query.to_lowercase();
        results.sort_by(|a, b| {
            // Exact name match gets priority
            let a_exact = a.name.to_lowercase() == query_lower;
            let b_exact = b.name.to_lowercase() == query_lower;
            if a_exact != b_exact {
                return b_exact.cmp(&a_exact);
            }

            // Prefer earlier release dates (original releases over remakes/ports)
            match (&a.release_date, &b.release_date) {
                (Some(a_date), Some(b_date)) => a_date.cmp(b_date),
                (Some(_), None) => std::cmp::Ordering::Less,
                (None, Some(_)) => std::cmp::Ordering::Greater,
                (None, None) => std::cmp::Ordering::Equal,
            }
        });

        Ok(results)
    }

    /// Get full metadata for a specific game by IGDB ID
    pub async fn get_game_metadata(&self, igdb_id: u64) -> Result<IgdbGameMetadata, String> {
        let token = self.get_token().await?;

        let body = format!(
            r#"fields name, summary, first_release_date, cover.image_id, screenshots.image_id, genres.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher; where id = {};"#,
            igdb_id
        );

        let response = self.client
            .post("https://api.igdb.com/v4/games")
            .header("Client-ID", &self.client_id)
            .header("Authorization", format!("Bearer {}", token))
            .header("Content-Type", "text/plain")
            .header("Accept", "application/json")
            .body(body)
            .send()
            .await
            .map_err(|e| format!("IGDB request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(format!("IGDB fetch failed ({}): {}", status, text));
        }

        let games: Vec<IgdbGame> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse IGDB response: {}", e))?;

        let game = games.into_iter().next()
            .ok_or_else(|| "Game not found on IGDB".to_string())?;

        // Extract developer and publisher
        let mut developer: Option<String> = None;
        let mut publisher: Option<String> = None;

        if let Some(companies) = game.involved_companies {
            for ic in companies {
                if ic.developer && developer.is_none() {
                    developer = Some(ic.company.name.clone());
                }
                if ic.publisher && publisher.is_none() {
                    publisher = Some(ic.company.name);
                }
            }
        }

        let release_date = game.first_release_date.map(|ts| {
            chrono::DateTime::from_timestamp(ts, 0)
                .map(|dt| dt.format("%Y-%m-%d").to_string())
                .unwrap_or_default()
        });

        let cover_url = game.cover.map(|c| {
            format!("https://images.igdb.com/igdb/image/upload/t_cover_big/{}.jpg", c.image_id)
        });

        let screenshot_urls: Vec<String> = game.screenshots
            .unwrap_or_default()
            .into_iter()
            .take(5) // Limit to 5 screenshots
            .map(|s| format!("https://images.igdb.com/igdb/image/upload/t_screenshot_big/{}.jpg", s.image_id))
            .collect();

        let genres: Vec<String> = game.genres
            .unwrap_or_default()
            .into_iter()
            .map(|g| g.name)
            .collect();

        Ok(IgdbGameMetadata {
            igdb_id: game.id,
            name: game.name,
            summary: game.summary,
            release_date,
            genres,
            developer,
            publisher,
            cover_url,
            screenshot_urls,
        })
    }

    /// Download an image from a URL and save it to the specified path
    pub async fn download_image(&self, url: &str, save_path: &PathBuf) -> Result<(), String> {
        // Create parent directories if they don't exist
        if let Some(parent) = save_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        }

        let response = self.client
            .get(url)
            .send()
            .await
            .map_err(|e| format!("Failed to download image: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Image download failed: {}", response.status()));
        }

        let bytes = response
            .bytes()
            .await
            .map_err(|e| format!("Failed to read image bytes: {}", e))?;

        std::fs::write(save_path, bytes)
            .map_err(|e| format!("Failed to save image: {}", e))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_platform_mapping() {
        assert_eq!(get_igdb_platform_id("snes"), Some(19));
        assert_eq!(get_igdb_platform_id("ps2"), Some(8));
        assert_eq!(get_igdb_platform_id("unknown"), None);
    }
}
