/*
 * command: inspectDocument
 * Read-only. Dumps the active document's layer tree as JSON so the structure
 * can be inspected (and pasted back to Claude) before any edit is attempted.
 * Nothing here changes document state, so no executeAsModal is needed.
 */

const { requireActiveDocument } = require("../photoshop/host");
const logger = require("../utils/logger");

function round(n) {
  return typeof n === "number" ? Math.round(n) : n;
}

function readBounds(layer) {
  try {
    const b = layer.bounds;
    if (!b) return null;
    return {
      left: round(b.left),
      top: round(b.top),
      right: round(b.right),
      bottom: round(b.bottom),
      width: round(b.right - b.left),
      height: round(b.bottom - b.top),
    };
  } catch (e) {
    return null;
  }
}

function readText(layer) {
  try {
    const textItem = layer.textItem;
    if (!textItem) return null;
    const style = textItem.characterStyle || {};
    const color = style.color;
    return {
      contents: textItem.contents,
      font: style.font,
      size: round(style.size),
      tracking: style.tracking,
      leading: round(style.leading),
      color: color
        ? { r: round(color.rgb.red), g: round(color.rgb.green), b: round(color.rgb.blue) }
        : null,
    };
  } catch (e) {
    return { readError: String(e && e.message ? e.message : e) };
  }
}

function describeLayer(layer) {
  const info = {
    id: layer.id,
    name: layer.name,
    kind: String(layer.kind),
    visible: layer.visible,
    opacity: layer.opacity,
    blendMode: String(layer.blendMode),
    locked: layer.locked,
    bounds: readBounds(layer),
  };

  const text = readText(layer);
  if (text) info.text = text;

  if (layer.layers && layer.layers.length) {
    info.children = layer.layers.map(describeLayer);
  }
  return info;
}

async function inspectDocument() {
  const doc = requireActiveDocument();
  const report = {
    document: {
      id: doc.id,
      title: doc.title,
      width: round(doc.width),
      height: round(doc.height),
      resolution: doc.resolution,
      mode: String(doc.mode),
      path: (() => {
        try {
          return doc.path || null;
        } catch (e) {
          return null;
        }
      })(),
    },
    layers: doc.layers.map(describeLayer),
  };

  logger.info("Document structure:\n" + JSON.stringify(report, null, 2));
  return report;
}

module.exports = { inspectDocument };
