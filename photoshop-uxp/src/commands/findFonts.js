/*
 * command: findFonts
 * Read-only. Lists installed fonts whose family / name / postScriptName matches
 * a query. setTextStyle needs the exact postScriptName, which is what this finds.
 *
 *   { action: "findFonts", params: { query: "Sansation" } }
 */

const { app } = require("../photoshop/host");
const logger = require("../utils/logger");

async function findFonts(params = {}) {
  const query = String(params.query || "").toLowerCase();
  const fonts = [];

  for (const font of app.fonts) {
    const entry = {
      postScriptName: font.postScriptName,
      name: font.name,
      family: font.family,
      style: font.style,
    };
    const haystack = `${entry.postScriptName} ${entry.name} ${entry.family}`.toLowerCase();
    if (!query || haystack.includes(query)) fonts.push(entry);
  }

  if (query && fonts.length === 0) {
    logger.warn(
      `找不到任何符合 "${params.query}" 的字型。請先在 Windows 安裝該字型並重新啟動 Photoshop。`
    );
  } else {
    logger.info(`Fonts matching "${params.query || "*"}" (${fonts.length}):\n` +
      JSON.stringify(fonts, null, 2));
  }

  return { query: params.query || null, count: fonts.length, fonts };
}

module.exports = { findFonts };
