import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, "..", "logs");
const errorLogPath = path.join(logsDir, "error.log");
const infoLogPath = path.join(logsDir, "info.log");

// Function to initialize log files
const initializeLogs = async () => {
  try {
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logsDir)) {
      await fs.promises.mkdir(logsDir, { recursive: true });
    }

    // Create info log file if it doesn't exist
    if (!fs.existsSync(infoLogPath)) {
      await fs.promises.writeFile(infoLogPath, "");
    }

    // Create error log file if it doesn't exist
    if (!fs.existsSync(errorLogPath)) {
      await fs.promises.writeFile(errorLogPath, "");
    }
  } catch (error) {
    console.error("Error initializing log files:", error);
  }
};

// Initialize logger
await initializeLogs();

// Log error message
export const logError = (message, error = null) => {
  let logMessage = `[ERROR] ${new Date().toISOString()} - ${message}\n`;
  if (error) {
    logMessage += `Error Details: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}\n`;
  }
  console.error(logMessage);
  fs.appendFileSync(errorLogPath, logMessage);
};

// Log info message
export const logInfo = (message) => {
  const logMessage = `[INFO] ${new Date().toISOString()} - ${message}\n`;
  fs.appendFileSync(infoLogPath, logMessage);
  console.log(logMessage);
};