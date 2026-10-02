/*
 * command: setTextStyle
 * Restyles an existing text layer in place — font, size, colour, tracking,
 * leading, alignment. The layer stays editable and `contents` is never changed.
 *
 *   {
 *     action: "setTextStyle",
 *     target: "THIN AS A CREDIT CARD",      // layer name
 *     params: {
 *       font: "Sansation-Bold",             // exact postScriptName (see findFonts)
 *       size: 96,
 *       color: { r: 255, g: 255, b: 255 },
 *       tracking: -10,
 *       leading: 100,
 *       justification: "left"
 *     }
 *   }
 */

const { requireActiveDocument, runModal } = require("../photoshop/host");
const { findLayerByName } = require("../photoshop/layers");
const { applyTextStyle } = require("../photoshop/text");
const logger = require("../utils/logger");

async function setTextStyle(params = {}, command = {}) {
  const name = command.target || params.target || params.name;
  if (!name) throw new Error('setTextStyle needs a target layer name, e.g. target: "HEADLINE"');

  const doc = requireActiveDocument();
  const layer = findLayerByName(doc, name);
  if (!layer) throw new Error(`找不到圖層 "${name}"。先用 inspectDocument 確認圖層名稱。`);

  const textItem = layer.textItem;
  if (!textItem) throw new Error(`圖層 "${name}" 不是文字圖層，無法套用文字樣式。`);

  const contents = textItem.contents || "";
  logger.info(`Styling text layer "${name}" (${contents.length} chars)`, JSON.stringify(params));

  await runModal(`Set text style: ${name}`, async () => {
    await applyTextStyle(layer.id, contents.length, params);
  });

  logger.info(`Text style applied to "${name}"`);
  return { layerId: layer.id, layerName: layer.name, contents, applied: params };
}

module.exports = { setTextStyle };
