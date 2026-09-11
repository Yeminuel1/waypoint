// Maps a country code (from IP geolocation) to one of our supported
// language codes. Countries not listed fall back to English.
const countryToLang = {
  // Spanish
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es",
  EC: "es", GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es",
  SV: "es", NI: "es", CR: "es", PA: "es", UY: "es", PR: "es",
  // French
  FR: "fr", BE: "fr", SN: "fr", CI: "fr", ML: "fr", LU: "fr", MC: "fr",
  // Turkish
  TR: "tr",
  // German
  DE: "de", AT: "de", LI: "de", CH: "de",
  // Italian
  IT: "it", SM: "it", VA: "it",
  // Portuguese
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt",
  // Arabic
  SA: "ar", AE: "ar", EG: "ar", QA: "ar", KW: "ar", BH: "ar", OM: "ar",
  JO: "ar", LB: "ar", IQ: "ar", MA: "ar", DZ: "ar", TN: "ar", LY: "ar",
  YE: "ar", SY: "ar", SD: "ar",
  // Chinese
  CN: "zh", TW: "zh", HK: "zh",
  // Japanese
  JP: "ja",
  // Russian
  RU: "ru", BY: "ru", KZ: "ru",
};

// Looks up the visitor's country via IP geolocation (ipapi.co, no API key
// needed for light usage) and returns a supported language code, or null if
// detection failed (caller should fall back to browser language / English).
export async function detectLanguageByIP(supportedCodes) {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) throw new Error("geo lookup failed");
    const data = await res.json();
    const code = countryToLang[data.country_code] || "en";
    return supportedCodes.includes(code) ? code : "en";
  } catch (e) {
    return null;
  }
}
