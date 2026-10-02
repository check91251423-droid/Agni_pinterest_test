/*
 * File bridge — lets an external agent (Claude Code running on this machine)
 * drive Photoshop without any network layer.
 *
 * The user picks one folder once. The plugin then creates:
 *
 *   <bridge>/inbox/     *.json dropped here are executed, oldest name first
 *   <bridge>/outbox/    the matching result is written back with the same name
 *   <bridge>/processed/ the consumed request is moved here (audit trail)
 *
 * A request file holds one command object or an array of them:
 *   { "action": "createTextLayer", "params": { ... } }
 *   [ { "action": "..." }, { "action": "..." } ]
 *
 * The result file holds:
 *   { "requestFile", "startedAt", "finishedAt", "ok", "results": [ ... ] }
 *
 * No HTTP, no WebSocket, no external API — only the local filesystem, which is
 * why the plugin needs the localFileSystem permission in manifest.json.
 */

const uxpStorage = require("uxp").storage;
const fs = uxpStorage.localFileSystem;
const formats = uxpStorage.formats;

const { executeCommand } = require("./executeCommand");
const logger = require("../utils/logger");

const TOKEN_KEY = "claudeBridgeFolderToken";
const POLL_MS = 1000;

let folder = null;
let timer = null;
let busy = false;

async function ensureSubfolder(parent, name) {
  try {
    return await parent.getEntry(name);
  } catch (e) {
    return parent.createFolder(name);
  }
}

/** Prompt the user for the bridge folder and remember it across reloads. */
async function chooseFolder() {
  const picked = await fs.getFolder();
  if (!picked) {
    logger.warn("使用者取消了資料夾選擇。");
    return null;
  }
  const token = await fs.createPersistentToken(picked);
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    logger.warn("無法記住資料夾（下次要重選）:", e);
  }
  folder = picked;
  await ensureSubfolder(folder, "inbox");
  await ensureSubfolder(folder, "outbox");
  await ensureSubfolder(folder, "processed");
  logger.info(`Bridge folder: ${folder.nativePath}`);
  return folder;
}

/** Re-open the folder remembered from a previous session, if there is one. */
async function restoreFolder() {
  if (folder) return folder;
  let token = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch (e) {
    token = null;
  }
  if (!token) return null;
  try {
    folder = await fs.getEntryForPersistentToken(token);
    await ensureSubfolder(folder, "inbox");
    await ensureSubfolder(folder, "outbox");
    await ensureSubfolder(folder, "processed");
    logger.info(`Bridge folder restored: ${folder.nativePath}`);
    return folder;
  } catch (e) {
    logger.warn("記住的資料夾已失效，請重新選擇:", e);
    folder = null;
    return null;
  }
}

async function writeResult(outbox, fileName, payload) {
  const file = await outbox.createFile(fileName, { overwrite: true });
  await file.write(JSON.stringify(payload, null, 2), { format: formats.utf8 });
}

async function archive(entry, processed) {
  try {
    await entry.moveTo(processed, { overwrite: true });
  } catch (e) {
    // moveTo can fail if the name already exists on some platforms; fall back
    logger.warn(`無法封存 ${entry.name}，改為刪除:`, e);
    try {
      await entry.delete();
    } catch (e2) {
      logger.error(`也無法刪除 ${entry.name}:`, e2);
    }
  }
}

async function processOne(entry, outbox, processed) {
  const startedAt = new Date().toISOString();
  logger.info(`Bridge request: ${entry.name}`);

  let payload = { requestFile: entry.name, startedAt, ok: false, results: [] };

  try {
    const raw = await entry.read({ format: formats.utf8 });
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [parsed];

    let allOk = true;
    for (const command of list) {
      const response = await executeCommand(command);
      payload.results.push(response);
      if (!response.ok) {
        allOk = false;
        break; // stop the batch at the first failure
      }
    }
    payload.ok = allOk;
  } catch (error) {
    logger.error(`Bridge request ${entry.name} failed:`, error);
    payload.results.push({
      ok: false,
      action: null,
      error: { name: error.name || "Error", message: String(error && error.message ? error.message : error) },
    });
  }

  payload.finishedAt = new Date().toISOString();
  await writeResult(outbox, entry.name, payload);
  await archive(entry, processed);
  logger.info(`Bridge result written: outbox/${entry.name} (ok=${payload.ok})`);
}

async function poll() {
  if (busy || !folder) return;
  busy = true;
  try {
    const inbox = await folder.getEntry("inbox");
    const outbox = await folder.getEntry("outbox");
    const processed = await folder.getEntry("processed");

    const entries = (await inbox.getEntries())
      .filter((e) => e.isFile && e.name.toLowerCase().endsWith(".json"))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      await processOne(entry, outbox, processed);
    }
  } catch (error) {
    logger.error("Bridge poll failed:", error);
  } finally {
    busy = false;
  }
}

function isWatching() {
  return timer !== null;
}

async function start() {
  if (timer) return { watching: true, path: folder && folder.nativePath };
  if (!folder) await restoreFolder();
  if (!folder) await chooseFolder();
  if (!folder) return { watching: false, path: null };

  timer = setInterval(poll, POLL_MS);
  logger.info(`Bridge watching ${folder.nativePath}\\inbox (每 ${POLL_MS}ms)`);
  poll();
  return { watching: true, path: folder.nativePath };
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info("Bridge stopped.");
  }
  return { watching: false, path: folder && folder.nativePath };
}

module.exports = { start, stop, isWatching, chooseFolder, restoreFolder, poll };
