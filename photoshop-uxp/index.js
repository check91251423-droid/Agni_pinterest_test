/*
 * Panel entry point.
 * UI only — all Photoshop work goes through executeCommand().
 */

const logger = require("./src/utils/logger");
const { executeCommand, listActions } = require("./src/bridge/executeCommand");
const { getActiveDocument } = require("./src/photoshop/host");
const fileBridge = require("./src/bridge/fileBridge");

const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");

function appendLog(level, text) {
  if (!logEl) return;
  const line = document.createElement("div");
  line.className = `log-line ${level}`;
  line.textContent = text;
  logEl.appendChild(line);
  logEl.scrollTop = logEl.scrollHeight;
}

function setStatus(text, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.className = isError ? "status error" : "status";
}

logger.onMessage(appendLog);

function reportDocument() {
  const doc = getActiveDocument();
  if (!doc) {
    logger.warn("Active document: none");
    setStatus("沒有開啟文件 — 請先在 Photoshop 開啟 PSD", true);
    return null;
  }
  logger.info(`Active document: ${doc.title} (${doc.width}x${doc.height})`);
  setStatus(`文件：${doc.title}`);
  return doc;
}

async function run(command, busyLabel) {
  setStatus(busyLabel);
  const response = await executeCommand(command);
  if (response.ok) {
    setStatus(`完成：${response.action}`);
  } else {
    setStatus(`失敗：${response.error.message}`, true);
  }
  return response;
}

document.getElementById("btn-create-test-layer").addEventListener("click", () => {
  run({ action: "createTestLayer", params: { name: "CLAUDE TEST" } }, "建立測試圖層…");
});

document.getElementById("btn-doc-info").addEventListener("click", () => {
  reportDocument();
});

document.getElementById("btn-inspect").addEventListener("click", () => {
  run({ action: "inspectDocument" }, "讀取圖層結構…");
});

document.getElementById("btn-find-fonts").addEventListener("click", () => {
  run({ action: "findFonts", params: { query: "Sansation" } }, "搜尋字型…");
});

const bridgeStatusEl = document.getElementById("bridge-status");
const bridgeToggleEl = document.getElementById("btn-bridge-toggle");

function renderBridge(state) {
  const watching = state && state.watching;
  bridgeToggleEl.textContent = watching ? "停止 Claude 橋接" : "啟動 Claude 橋接";
  bridgeStatusEl.className = watching ? "status live" : "status";
  bridgeStatusEl.textContent = watching
    ? `橋接中：${state.path}\\inbox`
    : state && state.path
    ? `橋接：已停止（${state.path}）`
    : "橋接：未啟動";
}

bridgeToggleEl.addEventListener("click", async () => {
  try {
    const state = fileBridge.isWatching() ? fileBridge.stop() : await fileBridge.start();
    renderBridge(state);
  } catch (error) {
    logger.error("橋接啟動失敗:", error);
  }
});

document.getElementById("btn-bridge-folder").addEventListener("click", async () => {
  try {
    fileBridge.stop();
    await fileBridge.chooseFolder();
    renderBridge(await fileBridge.start());
  } catch (error) {
    logger.error("選擇資料夾失敗:", error);
  }
});

document.getElementById("btn-run").addEventListener("click", async () => {
  const input = document.getElementById("command-input");
  const raw = (input.value || "").trim();
  if (!raw) {
    logger.warn("command 欄位是空的。");
    return;
  }
  let command;
  try {
    command = JSON.parse(raw);
  } catch (error) {
    logger.error("command JSON 解析失敗:", error);
    setStatus("JSON 格式錯誤", true);
    return;
  }
  // An array runs as a sequence, stopping at the first failure.
  const list = Array.isArray(command) ? command : [command];
  for (const item of list) {
    const response = await run(item, `執行 ${item && item.action}…`);
    if (!response.ok) break;
  }
});

document.getElementById("btn-clear-log").addEventListener("click", () => {
  if (logEl) logEl.innerHTML = "";
});

logger.info("Plugin loaded");
logger.info(`Registered actions: ${listActions().join(", ")}`);
reportDocument();

// Exposed so a future transport (or the DevTools console) can drive the bridge:
//   await window.PhotoshopBridge.executeCommand({ action: "createTestLayer" })
window.PhotoshopBridge = { executeCommand, listActions, fileBridge };

fileBridge
  .restoreFolder()
  .then((f) => renderBridge({ watching: false, path: f && f.nativePath }))
  .catch((e) => logger.warn("restoreFolder:", e));
