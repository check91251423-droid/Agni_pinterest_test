#!/usr/bin/env node
/*
 * ps.js — send a command to Photoshop through the file bridge and print the result.
 * Node only, no dependencies. Run this on the same machine as Photoshop.
 *
 *   node tools/ps.js <bridgeFolder> '{"action":"inspectDocument"}'
 *   node tools/ps.js <bridgeFolder> ./command.json
 *
 * The plugin's "啟動 Claude 橋接" button must be on and pointed at <bridgeFolder>.
 */

const fs = require("fs");
const path = require("path");

const TIMEOUT_MS = 120000;
const POLL_MS = 300;

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error("Usage: node tools/ps.js <bridgeFolder> <json-string | file.json>");
  process.exit(1);
}

const [bridgeDir, input] = process.argv.slice(2);
if (!bridgeDir || !input) usage("missing arguments");
if (!fs.existsSync(bridgeDir)) usage(`bridge folder not found: ${bridgeDir}`);

const raw = fs.existsSync(input) ? fs.readFileSync(input, "utf8") : input;

let command;
try {
  command = JSON.parse(raw);
} catch (e) {
  usage(`invalid JSON: ${e.message}`);
}

const inbox = path.join(bridgeDir, "inbox");
const outbox = path.join(bridgeDir, "outbox");
for (const dir of [inbox, outbox]) fs.mkdirSync(dir, { recursive: true });

const name = `${Date.now()}-${process.pid}.json`;
fs.writeFileSync(path.join(inbox, name), JSON.stringify(command, null, 2), "utf8");
console.error(`-> inbox/${name}`);

const resultPath = path.join(outbox, name);
const deadline = Date.now() + TIMEOUT_MS;

(function wait() {
  if (fs.existsSync(resultPath)) {
    const result = JSON.parse(fs.readFileSync(resultPath, "utf8"));
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  }
  if (Date.now() > deadline) {
    console.error(
      "Timed out. 檢查：Photoshop 有開著嗎？Plugin 面板的「啟動 Claude 橋接」是亮的嗎？資料夾選對了嗎？"
    );
    process.exit(2);
  }
  setTimeout(wait, POLL_MS);
})();
