/*
 * Command registry.
 *
 * Every automation command is a plain async function (params, command) => result.
 * `executeCommand` (src/bridge/executeCommand.js) is the only caller, so adding a
 * new Photoshop operation means:
 *   1. write src/commands/<name>.js using src/photoshop/* helpers
 *   2. register it in `commands` below
 *
 * PLANNED lists the roadmap. Those names are intentionally NOT implemented yet —
 * executeCommand reports them as "not implemented" instead of failing silently.
 */

const { createTestLayer } = require("./createTestLayer");

const commands = {
  createTestLayer,
};

const PLANNED = [
  // document / layer basics
  "getDocument", "getLayers", "findLayer", "createLayer", "deleteLayer",
  "duplicateLayer", "renameLayer", "setLayerVisibility", "moveLayer", "groupLayers",
  // smart objects (PRODUCT artwork must stay a smart object)
  "createSmartObject", "replaceSmartObjectContents", "placeEmbedded",
  // transforms (uniform scale by default — never distort PRODUCT)
  "transform", "scale", "rotate", "perspective", "distort",
  // masking / compositing
  "addLayerMask", "applyClippingMask", "setBlendMode", "setOpacity",
  // adjustments (adjustment layers, not destructive filters)
  "curves", "levels", "colorBalance", "hueSaturation",
  // light & shadow (kept on their own layers: PRODUCT_SHADOW, PRODUCT_HIGHLIGHT, ...)
  "gaussianBlur", "dropShadow", "contactShadow",
  // canvas & output
  "select", "setSelection", "crop", "resizeCanvas", "export", "saveAs",
  // escape hatch
  "batchPlay",
];

module.exports = { commands, PLANNED };
