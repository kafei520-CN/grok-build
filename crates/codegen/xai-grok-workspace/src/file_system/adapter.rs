//! AcpFsAdapter: implements `xai-grok-tools::AsyncFileSystem` using ACP gateway calls.
//!
//! This adapter enables file tool execution over ACP (remote filesystem).
//! It translates xai-grok-tools' `AsyncFileSystem` trait into ACP protocol calls:
//!   `read_file()` → read_text_file
//!   `write_file()` → write_text_file
//!   `delete_file()` → not supported by ACP (returns error)
//!
//! Mirrors the pattern of `AcpTerminalAdapter` for terminal execution.

use std::path::Path;

use agent_client_protocol as acp;
use base64::Engine as _;
use xai_acp_lib::AcpAgentGatewaySender as GatewaySender;
use xai_grok_tools::computer::types::{AsyncFileSystem, ComputerError};

/// Wraps xai-grok-shell's ACP gateway to satisfy xai-grok-tools' AsyncFileSystem.
///
/// When a client advertises `clientCapabilities.fs.readTextFile` and `writeTextFile`,
/// file operations from tools (read_file, search_replace, etc.) are routed through
/// the ACP gateway back to the client instead of hitting the local disk directly.
pub struct AcpFsAdapter {
    gateway: GatewaySender,
    session_id: acp::SessionId,
}

impl AcpFsAdapter {
    pub fn new(gateway: GatewaySender, session_id: acp::SessionId) -> Self {
        Self {
            gateway,
            session_id,
        }
    }
}

#[async_trait::async_trait]
impl AsyncFileSystem for AcpFsAdapter {
    async fn read_file(&self, path: &Path) -> Result<Vec<u8>, ComputerError> {
        let read_req = acp::ReadTextFileRequest::new(self.session_id.clone(), path.to_path_buf());

        let response = self
            .gateway
            .send(read_req)
            .await
            .map_err(acp_error_to_computer_error)?;

        let bytes = bytes_from_read_text_file(response);
        if path_looks_like_media(path) && !bytes_look_like_media(&bytes) {
            if let Ok(disk) = tokio::fs::read(path).await {
                return Ok(disk);
            }
        }
        Ok(bytes)
    }

    async fn write_file(&self, path: &Path, data: &[u8]) -> Result<(), ComputerError> {
        let content =
            String::from_utf8(data.to_vec()).map_err(|e| ComputerError::io(e.to_string()))?;

        let write_req =
            acp::WriteTextFileRequest::new(self.session_id.clone(), path.to_path_buf(), content);

        self.gateway
            .send(write_req)
            .await
            .map_err(acp_error_to_computer_error)?;

        Ok(())
    }

    async fn delete_file(&self, path: &Path) -> Result<(), ComputerError> {
        // ACP protocol doesn't support file deletion yet
        tracing::warn!(?path, "ACP filesystem does not support file deletion");
        Err(ComputerError::io("File deletion not supported via ACP"))
    }
}

fn acp_error_to_computer_error(err: acp::Error) -> ComputerError {
    match acp_error_to_io_kind(&err) {
        Some(kind) => ComputerError::io_with_kind(err.to_string(), kind),
        None => ComputerError::io(err.to_string()),
    }
}

/// Reconstruct file bytes from `fs/read_text_file`.
///
/// JSON cannot carry raw binary, so clients send images as base64 with
/// `_meta.encoding = "base64"`. Text files stay as UTF-8 `content`.
pub(crate) fn bytes_from_read_text_file(response: acp::ReadTextFileResponse) -> Vec<u8> {
    let encoding = response
        .meta
        .as_ref()
        .and_then(|meta| meta.get("encoding"))
        .and_then(|value| value.as_str());
    if encoding == Some("base64") {
        if let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(response.content.trim())
        {
            return bytes;
        }
    }
    response.content.into_bytes()
}

fn path_looks_like_media(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_ascii_lowercase()
            .as_str(),
        "png"
            | "jpg"
            | "jpeg"
            | "gif"
            | "webp"
            | "bmp"
            | "ico"
            | "avif"
            | "tif"
            | "tiff"
            | "pdf"
    )
}

fn bytes_look_like_media(bytes: &[u8]) -> bool {
    infer::get(bytes).is_some_and(|kind| {
        kind.mime_type().starts_with("image/") || kind.mime_type() == "application/pdf"
    })
}

fn acp_error_to_io_kind(err: &acp::Error) -> Option<std::io::ErrorKind> {
    let msg_lower = err.message.to_ascii_lowercase();

    if err.code == acp::ErrorCode::ResourceNotFound {
        Some(std::io::ErrorKind::NotFound)
    } else if msg_lower.contains("permission denied") {
        Some(std::io::ErrorKind::PermissionDenied)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::bytes_from_read_text_file;
    use agent_client_protocol as acp;
    use serde_json::{Map, Value};

    fn png_header() -> Vec<u8> {
        vec![0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    }

    #[test]
    fn text_content_stays_utf8_bytes() {
        let response = acp::ReadTextFileResponse::new("hello");
        assert_eq!(bytes_from_read_text_file(response), b"hello");
    }

    #[test]
    fn base64_meta_restores_png_bytes() {
        let raw = png_header();
        let mut meta = Map::new();
        meta.insert("encoding".into(), Value::String("base64".into()));
        let mut response = acp::ReadTextFileResponse::new(base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &raw,
        ));
        response.meta = Some(meta);
        assert_eq!(bytes_from_read_text_file(response), raw);
    }

    #[test]
    fn utf8_round_trip_does_not_preserve_png_magic() {
        let raw = png_header();
        let as_text = String::from_utf8_lossy(&raw).into_owned();
        let response = acp::ReadTextFileResponse::new(as_text);
        let recovered = bytes_from_read_text_file(response);
        assert_ne!(recovered, raw);
        assert_ne!(recovered.first().copied(), Some(0x89));
    }
}
