/**
 * logger.ts
 * 
 * Utility for consistent logging across the application
 */

// Define log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Set default level - can be overridden
let currentLogLevel = LogLevel.DEBUG;

// Add terminal color codes for better visibility
const COLORS = {
  reset: '\x1b[0m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

// Class for creating loggers with specific prefixes
class Logger {
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /**
   * Log debug message
   */
  debug(message: string, ...args: any[]): void {
    if (currentLogLevel <= LogLevel.DEBUG) {
      console.log(`${COLORS.cyan}[DEBUG]${COLORS.reset} [${this.prefix}] ${message}`, ...args);
    }
  }

  /**
   * Log info message
   */
  info(message: string, ...args: any[]): void {
    if (currentLogLevel <= LogLevel.INFO) {
      console.log(`${COLORS.green}[INFO]${COLORS.reset} [${this.prefix}] ${message}`, ...args);
    }
  }

  /**
   * Log warning message
   */
  warn(message: string, ...args: any[]): void {
    if (currentLogLevel <= LogLevel.WARN) {
      console.warn(`${COLORS.yellow}[WARN]${COLORS.reset} [${this.prefix}] ${message}`, ...args);
    }
  }

  /**
   * Log error message
   */
  error(message: string, ...args: any[]): void {
    if (currentLogLevel <= LogLevel.ERROR) {
      console.error(`${COLORS.red}[ERROR]${COLORS.reset} [${this.prefix}] ${message}`, ...args);
    }
  }

  /**
   * Create a child logger with additional prefix
   */
  child(childPrefix: string): Logger {
    return new Logger(`${this.prefix}:${childPrefix}`);
  }
}

/**
 * Set the current log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
  const levelName = LogLevel[level];
  console.log(`${COLORS.magenta}[LOGGER]${COLORS.reset} Log level set to ${levelName}`);
}

/**
 * Get the current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Create a new logger with a prefix
 */
export function createLogger(prefix: string): Logger {
  return new Logger(prefix);
}

// Create a default root logger
export const rootLogger = new Logger('App');

// Export a default logger instance
export default rootLogger; 