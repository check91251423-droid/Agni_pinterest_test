/*
 * command: createTestLayer
 * Creates an empty pixel layer named "CLAUDE TEST" in the active document.
 * This is the smoke test for the whole Claude Code -> UXP -> Photoshop chain.
 */

const { requireActiveDocument, runModal } = require("../photoshop/host");
const { createPixelLayer } = require("../photoshop/layers");
const logger = require("../utils/logger");

const DEFAULT_NAME = "CLAUDE TEST";

async function createTestLayer(params = {}) {
  const name = params.name || DEFAULT_NAME;

  const doc = requireActiveDocument();
  logger.info(`Active document: ${doc.title} (${doc.width}x${doc.height})`);
  logger.info(`Creating layer... name="${name}"`);

  const layer = await runModal("Create test layer", async () => {
    return createPixelLayer(doc, name);
  });

  logger.info(`Layer created successfully: id=${layer.id} name="${layer.name}"`);

  return {
    documentId: doc.id,
    documentTitle: doc.title,
    layerId: layer.id,
    layerName: layer.name,
  };
}

module.exports = { createTestLayer, DEFAULT_NAME };
