/*
 * command: setLayerVisibility
 * Shows or hides a layer. Non-destructive — nothing is deleted.
 *
 *   { action: "setLayerVisibility", target: "OLD_HEADLINE", params: { visible: false } }
 */

const { requireActiveDocument, runModal } = require("../photoshop/host");
const { findLayerByName } = require("../photoshop/layers");
const logger = require("../utils/logger");

async function setLayerVisibility(params = {}, command = {}) {
  const name = command.target || params.target || params.name;
  if (!name) throw new Error("setLayerVisibility needs a target layer name.");

  const doc = requireActiveDocument();
  const layer = findLayerByName(doc, name);
  if (!layer) throw new Error(`找不到圖層 "${name}"。`);

  const visible = params.visible !== false;
  await runModal(`Set visibility: ${name}`, async () => {
    layer.visible = visible;
  });

  logger.info(`Layer "${name}" visible=${visible}`);
  return { layerId: layer.id, layerName: layer.name, visible };
}

module.exports = { setLayerVisibility };
