export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  service: string;
  organizationId?: string;
  userId?: string;
  deviceId?: string;
  correlationId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: Omit<LogContext, 'service'>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class KiotLogger {
  private readonly baseContext: LogContext;
  private readonly minLevel: LogLevel;

  constructor(baseContext: LogContext, minLevel: LogLevel = 'info') {
    this.baseContext = baseContext;
    this.minLevel = minLevel;
  }

  public child(additionalContext: Partial<LogContext>): KiotLogger {
    return new KiotLogger(
      { ...this.baseContext, ...additionalContext },
      this.minLevel
    );
  }

  public debug(message: string, meta?: Record<string, unknown>): void {
    this.write('debug', message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>): void {
    this.write('info', message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>): void {
    this.write('warn', message, meta);
  }

  public error(message: string, err?: unknown, meta?: Record<string, unknown>): void {
    const errorObj =
      err instanceof Error
        ? { name: err.name, message: err.message, stack: err.stack }
        : err
          ? { name: 'Error', message: String(err) }
          : undefined;
    this.write('error', message, meta, errorObj);
  }

  private write(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>,
    errorObj?: LogEntry['error']
  ): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const { service, ...restBase } = this.baseContext;
    const mergedContext = { ...restBase, ...(meta || {}) };

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service,
      message,
      ...(Object.keys(mergedContext).length > 0 ? { context: mergedContext } : {}),
      ...(errorObj ? { error: errorObj } : {}),
    };

    const serialized = JSON.stringify(entry);
    if (level === 'error') {
      console.error(serialized);
    } else if (level === 'warn') {
      console.warn(serialized);
    } else {
      console.log(serialized);
    }
  }
}

export function createLogger(service: string, minLevel: LogLevel = 'info'): KiotLogger {
  return new KiotLogger({ service }, minLevel);
}
