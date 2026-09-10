//! Decode subprocess stdout that is not UTF-8 (Windows cmd OEM/GBK).

/// Turn process output bytes into a UTF-8 string.
///
/// Piped `cmd.exe` on Chinese Windows writes CP936/GBK, not UTF-8. Feeding
/// those bytes to `String::from_utf8_lossy` replaces every CJK character.
pub fn decode_process_output(bytes: &[u8]) -> String {
    if bytes.is_empty() {
        return String::new();
    }
    if let Ok(text) = std::str::from_utf8(bytes) {
        return text.to_owned();
    }
    decode_legacy(bytes)
}

fn decode_legacy(bytes: &[u8]) -> String {
    #[cfg(windows)]
    {
        let (text, _, _) = encoding_rs::GBK.decode(bytes);
        return text.into_owned();
    }
    #[cfg(not(windows))]
    {
        String::from_utf8_lossy(bytes).into_owned()
    }
}

#[cfg(test)]
mod tests {
    use super::decode_process_output;

    #[test]
    fn keeps_utf8() {
        assert_eq!(decode_process_output("ok 你好".as_bytes()), "ok 你好");
    }

    #[cfg(windows)]
    #[test]
    fn decodes_gbk_dir_header() {
        let (bytes, _, _) = encoding_rs::GBK.encode("驱动器 E 中的卷是 文档");
        let text = decode_process_output(&bytes);
        assert!(
            text.contains("驱动器") && text.contains("文档"),
            "got {text:?}"
        );
        assert!(!text.contains('\u{FFFD}'));
    }
}
