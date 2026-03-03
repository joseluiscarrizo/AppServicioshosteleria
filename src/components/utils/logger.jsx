const Logger = {
  info: (message, data) => {
    if (data) console.info(`[INFO] ${message}`, data);
    else console.info(`[INFO] ${message}`);
  },
  warn: (message, data) => {
    if (data) console.warn(`[WARN] ${message}`, data);
    else console.warn(`[WARN] ${message}`);
  },
  error: (message, data) => {
    if (data) console.error(`[ERROR] ${message}`, data);
    else console.error(`[ERROR] ${message}`);
  },
  debug: (message, data) => {
    if (data) console.debug(`[DEBUG] ${message}`, data);
    else console.debug(`[DEBUG] ${message}`);
  }
};

export default Logger;