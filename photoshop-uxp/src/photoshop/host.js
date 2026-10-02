/*
 * Thin wrapper around the Photoshop UXP host APIs.
 * Nothing here uses CEP / ExtendScript / JSX — only `require("photoshop")`.
 */

const photoshop = require("photoshop");
const logger = require("../utils/logger");

const app = photoshop.app;
const core = photoshop.core;
const action = photoshop.action;
const constants = photoshop.constants;

/** Returns the active document, or null when nothing is open. */
function getActiveDocument() {
  try {
    if (!app.documents || app.documents.length === 0) return null;
    return app.activeDocument || null;
  } catch (e) {
    // Photoshop throws instead of returning null in some versions
    logger.warn("getActiveDocument() threw:", e);
    return null;
  }
}

/** Same as getActiveDocument(), but throws a readable error instead of returning null. */
function requireActiveDocument() {
  const doc = getActiveDocument();
  if (!doc) {
    throw new Error(
      "沒有開啟任何 Photoshop 文件（No active document）。請先在 Photoshop 開啟一個 PSD 再執行。"
    );
  }
  return doc;
}

/**
 * Run `fn` inside executeAsModal — required for anything that changes
 * document state. Returns whatever `fn` returns.
 */
async function runModal(commandName, fn) {
  return core.executeAsModal(
    async (executionContext) => fn(executionContext),
    { commandName }
  );
}

/**
 * batchPlay helper. Always called from inside a modal scope by our commands.
 * Rejects on the first descriptor that reports an error.
 */
async function batchPlay(descriptors, options = {}) {
  const result = await action.batchPlay(descriptors, {
    synchronousExecution: false,
    modalBehavior: "execute",
    ...options,
  });
  for (const entry of result || []) {
    if (entry && entry.message && entry.available === undefined) {
      throw new Error(`batchPlay failed: ${entry.message}`);
    }
  }
  return result;
}

module.exports = {
  photoshop,
  app,
  core,
  action,
  constants,
  getActiveDocument,
  requireActiveDocument,
  runModal,
  batchPlay,
};
