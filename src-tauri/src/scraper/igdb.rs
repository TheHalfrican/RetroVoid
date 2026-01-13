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
pub fn get_igdb_platform_id(platform_id: &str) -> Option<u64> {
    let mapping: HashMap<&str, u64> = [
        ("nes", 18),
        ("snes", 19),
        ("n64", 4),
        ("gamecube", 21),
        ("wii", 5),
        ("switch", 130),
        ("gb", 33),
        ("gbc", 22),
        ("gba", 24),
        ("nds", 20),
        ("3ds", 37),
        ("ps1", 7),
        ("ps2", 8),
        ("ps3", 9),
        ("psp", 38),
        ("vita", 46),
        ("genesis", 29),
        ("saturn", 32),
        ("dreamcast", 23),
        ("xbox", 11),
        ("xbox360", 12),
        ("arcade", 52),
        ("sms", 64),      // Sega Master System
        ("gamegear", 35), // Game Gear
        ("32x", 30),      // Sega 32X
        ("dos", 13),      // DOS
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
    pub async fn search_games(&self, query: &str, _platform_id: Option<&str>) -> Result<Vec<IgdbSearchResult>, String> {
        let token = self.get_token().await?;

        // Escape the query for IGDB
        let escaped_query = query.replace("\"", "\\\"");

        // Use search keyword - note: where clause doesn't combine well with search
        let body = format!(
            "search \"{}\"; fields name, summary, first_release_date, cover.image_id, platforms.name; limit 20;",
            escaped_query
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
            return Err(format!("IGDB search failed ({}): {}", status, text));
        }

        let games: Vec<IgdbGame> = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse IGDB response: {}", e))?;

        println!("IGDB search found {} results", games.len());

        // Convert to our search result format
        let results: Vec<IgdbSearchResult> = games
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
