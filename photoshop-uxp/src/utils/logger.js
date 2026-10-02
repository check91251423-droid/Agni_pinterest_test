/*
 * Minimal logger for the UXP panel.
 * Every message goes to the UXP / DevTools console AND to any UI listener,
 * so the same text can be copied out of the panel or out of DevTools.
 */

const listeners = new Set();

function emit(level, text) {
  for (const fn of listeners) {
    try {
      fn(level, text);
    } catch (e) {
      // never let a UI listener break plugin logic
      console.error("[UXP ERROR] log listener failed:", e);
    }
  }
}

function stringify(value) {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  }
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
}

function join(parts) {
  return parts.map(stringify).join(" ");
}

const logger = {
  onMessage(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  info(...parts) {
    const text = `[UXP] ${join(parts)}`;
    console.log(text);
    emit("info", text);
  },

  warn(...parts) {
    const text = `[UXP WARN] ${join(parts)}`;
    console.warn(text);
    emit("warn", text);
  },

  error(...parts) {
    const text = `[UXP ERROR] ${join(parts)}`;
    console.error(text);
    emit("error", text);
  },
};

module.exports = logger;
