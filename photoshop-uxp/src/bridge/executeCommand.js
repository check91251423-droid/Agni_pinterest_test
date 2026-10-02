/*
 * Automation bridge.
 *
 * Single entry point for every Photoshop operation:
 *
 *   executeCommand({ action: "createTestLayer", params: { name: "CLAUDE TEST" } })
 *   executeCommand({ action: "transform", target: "PRODUCT", params: { scale: 0.85 } })
 *
 * Always resolves (never throws) with:
 *   { ok: true,  action, result }
 *   { ok: false, action, error: { message, name, stack } }
 *
 * No network here on purpose: no HTTP server, no WebSocket, no external API.
 * A transport can be added later and simply call executeCommand().
 */

const { commands, PLANNED } = require("../commands");
const logger = require("../utils/logger");

function toErrorPayload(error) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: "Error", message: String(error) };
}

async function executeCommand(command) {
  if (!command || typeof command !== "object") {
    const error = new Error("command must be an object like { action, params }");
    logger.error(error);
    return { ok: false, action: null, error: toErrorPayload(error) };
  }

  const { action, params = {}, target } = command;

  try {
    if (typeof action !== "string" || !action) {
      throw new Error('command.action is required, e.g. { action: "createTestLayer" }');
    }

    const handler = commands[action];
    if (!handler) {
      const planned = PLANNED.includes(action) ? " (planned, not implemented yet)" : "";
      throw new Error(
        `Unknown action "${action}"${planned}. Available: ${Object.keys(commands).join(", ")}`
      );
    }

    logger.info(`executeCommand -> ${action}`, JSON.stringify({ target, params }));
    const result = await handler(params, command);
    logger.info(`executeCommand <- ${action} ok`);
    return { ok: true, action, result };
  } catch (error) {
    logger.error(`executeCommand <- ${action || "?"} failed:`, error);
    return { ok: false, action: action || null, error: toErrorPayload(error) };
  }
}

module.exports = { executeCommand, listActions: () => Object.keys(commands), PLANNED };
