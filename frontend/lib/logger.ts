/**
 * Lightweight structured logger for the frontend.
 * Zero dependencies, zero performance impact in production.
 * 
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Connection saved', { connId: '123', dbType: 'Azure SQL' });
 *   logger.warn('Slow API response', { endpoint: '/api/query', ms: 3200 });
 *   logger.error('Failed to fetch sessions', { error: err.message });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const isDev = process.env.NODE_ENV === 'development';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// In production, only warn and error are logged
const MIN_LEVEL: LogLevel = isDev ? 'debug' : 'warn';

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[MIN_LEVEL];
}

function formatLog(entry: LogEntry): string {
  const time = entry.timestamp.split('T')[1]?.replace('Z', '') ?? entry.timestamp;
  const prefix = `[${time}] [${entry.level.toUpperCase()}]`;
  return entry.data
    ? `${prefix} ${entry.message}`
    : `${prefix} ${entry.message}`;
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  };

  const formatted = formatLog(entry);

  switch (level) {
    case 'debug':
      console.debug(formatted, data ?? '');
      break;
    case 'info':
      console.info(formatted, data ?? '');
      break;
    case 'warn':
      console.warn(formatted, data ?? '');
      break;
    case 'error':
      console.error(formatted, data ?? '');
      break;
  }
}

export const logger = {
  debug: (msg: string, data?: Record<string, unknown>) => log('debug', msg, data),
  info: (msg: string, data?: Record<string, unknown>) => log('info', msg, data),
  warn: (msg: string, data?: Record<string, unknown>) => log('warn', msg, data),
  error: (msg: string, data?: Record<string, unknown>) => log('error', msg, data),

  /** Time an async operation and log the duration */
  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const ms = Math.round(performance.now() - start);
      log('info', `${label} completed`, { durationMs: ms });
      return result;
    } catch (err) {
      const ms = Math.round(performance.now() - start);
      log('error', `${label} failed`, {
        durationMs: ms,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  },
};
