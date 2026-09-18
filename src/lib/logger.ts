type Level = "debug" | "info" | "warn" | "error";

const priority: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel: Level = import.meta.env.PROD ? "warn" : "debug";

function log(level: Level, component: string, message: string, data?: unknown) {
  if (priority[level] < priority[minLevel]) return;
  if (data === undefined) console[level](`[${component}] ${message}`);
  else console[level](`[${component}] ${message}`, data);
}

export const logger = {
  debug: (component: string, message: string, data?: unknown) => log("debug", component, message, data),
  info: (component: string, message: string, data?: unknown) => log("info", component, message, data),
  warn: (component: string, message: string, data?: unknown) => log("warn", component, message, data),
  error: (component: string, message: string, data?: unknown) => log("error", component, message, data),
};
