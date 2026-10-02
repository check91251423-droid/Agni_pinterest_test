/*
 * command: moveLayer
 * Moves a layer without resampling it — translate by a delta, or align its
 * bounding box to an absolute position. Scale is never touched, so nothing
 * stretches or distorts.
 *
 *   { action: "moveLayer", target: "SUBHEAD", params: { dx: 0, dy: -40 } }
 *   { action: "moveLayer", target: "SUBHEAD", params: { left: 64, top: 240 } }
 */

const { requireActiveDocument, runModal } = require("../photoshop/host");
const { findLayerByName } = require("../photoshop/layers");
const logger = require("../utils/logger");

async function moveLayer(params = {}, command = {}) {
  const name = command.target || params.target || params.name;
  if (!name) throw new Error('moveLayer needs a target layer name, e.g. target: "SUBHEAD"');

  const doc = requireActiveDocument();
  const layer = findLayerByName(doc, name);
  if (!layer) throw new Error(`找不到圖層 "${name}"。先用 inspectDocument 確認圖層名稱。`);

  const before = layer.bounds;
  let dx = typeof params.dx === "number" ? params.dx : 0;
  let dy = typeof params.dy === "number" ? params.dy : 0;

  if (typeof params.left === "number") dx = params.left - before.left;
  if (typeof params.top === "number") dy = params.top - before.top;

  if (dx === 0 && dy === 0) {
    logger.warn(`moveLayer("${name}"): dx/dy are both 0, nothing to do.`);
    return { layerId: layer.id, layerName: layer.name, moved: false };
  }

  logger.info(`Moving "${name}" by dx=${dx} dy=${dy}`);
  await runModal(`Move layer: ${name}`, async () => {
    await layer.translate(dx, dy);
  });

  const after = layer.bounds;
  logger.info(
    `Moved "${name}": (${Math.round(before.left)}, ${Math.round(before.top)}) -> ` +
      `(${Math.round(after.left)}, ${Math.round(after.top)})`
  );

  return {
    layerId: layer.id,
    layerName: layer.name,
    moved: true,
    dx,
    dy,
    before: { left: Math.round(before.left), top: Math.round(before.top) },
    after: { left: Math.round(after.left), top: Math.round(after.top) },
  };
}

module.exports = { moveLayer };
