/*
 * Layer level helpers. Non-destructive by default:
 * nothing in here rasterizes, flattens or resamples existing artwork.
 */

const { app, batchPlay } = require("./host");
const logger = require("../utils/logger");

/** Flatten a document's layer tree into a single array (groups included). */
function flattenLayers(layers, out = []) {
  for (const layer of layers || []) {
    out.push(layer);
    if (layer.layers && layer.layers.length) flattenLayers(layer.layers, out);
  }
  return out;
}

/** Find the first layer whose name matches exactly. Returns null when absent. */
function findLayerByName(doc, name) {
  return flattenLayers(doc.layers).find((layer) => layer.name === name) || null;
}

/**
 * Create an empty pixel layer with the given name.
 * Must be called inside executeAsModal (see commands/*).
 */
async function createPixelLayer(doc, name) {
  if (typeof doc.createLayer === "function") {
    const layer = await doc.createLayer({ name });
    if (layer) return layer;
    logger.warn("doc.createLayer() returned nothing, falling back to batchPlay");
  }

  // Fallback for hosts without the DOM helper.
  await batchPlay([
    {
      _obj: "make",
      _target: [{ _ref: "layer" }],
      using: { _obj: "layer", name },
    },
  ]);

  const created = findLayerByName(doc, name);
  if (!created) throw new Error(`Layer "${name}" was not found after creation.`);
  return created;
}

module.exports = {
  flattenLayers,
  findLayerByName,
  createPixelLayer,
};
