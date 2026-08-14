/**
 * Normalizes product titles to extract the core game name.
 * Removes platform tags, service info, and listing-specific metadata.
 */
export function normalizeGameTitle(title) {
    if (!title)
        return "";
    let normalized = title;
    // 1. Remove common separators and their surrounding spaces
    normalized = normalized.replace(/[|/\\-]/g, " ");
    // 2. Remove common platform/service tags (case-insensitive)
    const tagsToRemove = [
        "PS4", "PS5", "PS4/PS5", "PS4/5", "PlayStation Network", "PSN",
        "Xbox", "Series X", "Series S", "XB1",
        "Steam", "PC", "Epic Games", "Battle.net", "Origin", "Ubisoft",
        "Şəxsi Hesab", "Personal Account", "Zəmanət", "Warranty",
        "Sürətli Çatdırılma", "Fast Delivery", "Instant", "Manual",
        "Offline", "Online", "Universal", "Global", "Region Free",
        "P2", "P3", "P1", "Primary", "Secondary",
        "1 il", "Ömürlük", "Zəmanəti",
    ];
    const tagRegex = new RegExp(`\\b(${tagsToRemove.join("|")})\\b`, "gi");
    normalized = normalized.replace(tagRegex, " ");
    // 3. Remove stock/price hints (e.g., "100 AZN", "Stokda")
    normalized = normalized.replace(/\d+\s*AZN/gi, " ");
    normalized = normalized.replace(/\bStokda\b/gi, " ");
    // 4. Remove emojis and decorative characters
    normalized = normalized.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, " ");
    // 5. Clean up whitespace
    normalized = normalized.replace(/\s+/g, " ").trim();
    // 6. Common abbreviations/shortenings
    const map = {
        "GTA 5": "Grand Theft Auto V",
        "GTA V": "Grand Theft Auto V",
        "FC 24": "EA Sports FC 24",
        "FC 25": "EA Sports FC 25",
        "FC 26": "EA Sports FC 26",
        "TLoU": "The Last of Us",
    };
    Object.entries(map).forEach(([short, long]) => {
        const regex = new RegExp(`^${short}$`, "i");
        if (regex.test(normalized)) {
            normalized = long;
        }
    });
    return normalized;
}
/**
 * Extracts edition info if present, but keeps it separate for fallback logic.
 */
export function getEditionInfo(title) {
    const editions = [
        "Deluxe Edition", "Ultimate Edition", "Premium Edition",
        "Complete Edition", "Gold Edition", "Director's Cut",
        "Game of the Year Edition", "GOTY", "Standard Edition",
    ];
    for (const edition of editions) {
        if (new RegExp(`\\b${edition}\\b`, "i").test(title)) {
            return edition;
        }
    }
    return null;
}
