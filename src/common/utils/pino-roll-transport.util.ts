import { mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Utility functions for configuring Pino log transports with pino-roll rotation.
 * Handles file rotation based on size and frequency using pino-roll.
 */

/**
 * Converts size string (e.g., "5MB", "10MB") to pino-roll format.
 * pino-roll accepts size as string with units: k, m, g (lowercase)
 *
 * @param sizeStr - Size string with unit (MB, GB, KB)
 * @returns Size string in pino-roll format
 */
function parseSizeForPinoRoll(sizeStr: string): string {
  const match = sizeStr.match(/^(\d+)(MB|GB|KB)$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}. Use format like "5MB", "1GB", "500KB"`);
  }

  const [, size, unit] = match;

  switch (unit.toUpperCase()) {
    case 'KB':
      return `${size}k`;
    case 'MB':
      return `${size}m`;
    case 'GB':
      return `${size}g`;
    default:
      throw new Error(`Unsupported size unit: ${unit}`);
  }
}

/**
 * Converts frequency string to pino-roll frequency format.
 *
 * @param frequency - Frequency string (daily, hourly, weekly)
 * @returns Frequency string for pino-roll
 */
function parseFrequency(frequency: string): 'daily' | 'hourly' | 'weekly' {
  const freq = frequency.toLowerCase();
  if (freq === 'daily' || freq === 'hourly' || freq === 'weekly') {
    return freq as 'daily' | 'hourly' | 'weekly';
  }
  throw new Error(`Unsupported frequency: ${frequency}. Use "daily", "hourly", or "weekly"`);
}

/**
 * Ensures logs directory exists and returns the log file path.
 *
 * @param filename - Base filename (without extension)
 * @returns Full path to log file
 */
function getLogFilePath(filename: string): string {
  const logsDir = join(process.cwd(), 'logs');
  mkdirSync(logsDir, { recursive: true });
  return join(logsDir, `${filename}.log`);
}

/**
 * Creates Pino transport configuration with pino-roll for file rotation.
 * Supports both JSON format (production) and pretty print (development).
 *
 * @param transports - Comma-separated transport types (console, file)
 * @param logConfig - Log configuration object
 * @returns Pino transport configuration or undefined for console-only
 */
export function createPinoTransportsWithRotation(
  transports: string,
  logConfig: {
    prefix: string;
    fileMaxSize: string;
    fileFrequency: string;
    prettyPrint?: boolean;
  },
): unknown {
  const transportTypes = transports.split(',').map((t) => t.trim().toLowerCase());

  // If only console transport and no pretty print, return undefined (use default JSON format)
  if (transportTypes.length === 1 && transportTypes[0] === 'console' && !logConfig.prettyPrint) {
    return undefined;
  }

  // Multiple transports configuration
  const targets: unknown[] = [];

  if (transportTypes.includes('console')) {
    if (logConfig.prettyPrint) {
      // Use pino-pretty for human-readable console output
      targets.push({
        target: 'pino-pretty',
        level: 'trace',
        options: {
          colorize: true,
          singleLine: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '[{correlationId}]({userId}) {msg}',
        },
      });
    } else {
      // Use JSON format for console
      targets.push({
        target: 'pino/file',
        level: 'trace',
        options: {
          destination: 1, // stdout
        },
      });
    }
  }

  if (transportTypes.includes('file')) {
    // Use pino-roll for file rotation (always JSON format for files)
    targets.push({
      target: 'pino-roll',
      level: 'trace',
      options: {
        file: getLogFilePath(logConfig.prefix),
        frequency: parseFrequency(logConfig.fileFrequency),
        size: parseSizeForPinoRoll(logConfig.fileMaxSize),
        mkdir: true,
        dateFormat: 'yyyyMMdd',
        symlink: false, // Disable symlink on Windows (requires admin privileges)
        limit: {
          count: 10, // Keep 10 rotated files
          removeOtherLogFiles: false,
        },
      },
    });
  }

  return {
    targets,
  };
}

/**
 * Creates a simple file transport configuration without rotation.
 * Useful for environments where external log rotation is preferred.
 * Supports both JSON format (production) and pretty print (development).
 *
 * @param transports - Comma-separated transport types (console, file)
 * @param logConfig - Log configuration object
 * @returns Pino transport configuration
 */
export function createSimplePinoTransports(
  transports: string,
  logConfig: {
    prefix: string;
    prettyPrint?: boolean;
  },
): unknown {
  const transportTypes = transports.split(',').map((t) => t.trim().toLowerCase());

  // If only console transport and no pretty print, return undefined (use default JSON format)
  if (transportTypes.length === 1 && transportTypes[0] === 'console' && !logConfig.prettyPrint) {
    return undefined;
  }

  // Multiple transports configuration
  const targets: unknown[] = [];

  if (transportTypes.includes('console')) {
    if (logConfig.prettyPrint) {
      // Use pino-pretty for human-readable console output
      targets.push({
        target: 'pino-pretty',
        level: 'trace',
        options: {
          colorize: true,
          singleLine: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '[{correlationId}]({userId}) {msg}',
        },
      });
    } else {
      // Use JSON format for console
      targets.push({
        target: 'pino/file',
        level: 'trace',
        options: {
          destination: 1, // stdout
        },
      });
    }
  }

  if (transportTypes.includes('file')) {
    // Simple file transport without rotation (always JSON format for files)
    targets.push({
      target: 'pino/file',
      level: 'trace',
      options: {
        destination: getLogFilePath(logConfig.prefix),
        mkdir: true,
      },
    });
  }

  return {
    targets,
  };
}