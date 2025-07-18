// Enhanced logging utility for the app
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: any;
}

class Logger {
  private logLevel: LogLevel = process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  setLogLevel(level: LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private addLog(level: LogLevel, message: string, context?: string, data?: any) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context,
      data,
    };

    this.logs.push(entry);

    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (process.env.NODE_ENV === 'development') {
      const prefix = context ? `[${context}]` : '';
      const logData = data ? [message, data] : [message];
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(`🔍 ${prefix}`, ...logData);
          break;
        case LogLevel.INFO:
          console.info(`ℹ️ ${prefix}`, ...logData);
          break;
        case LogLevel.WARN:
          console.warn(`⚠️ ${prefix}`, ...logData);
          break;
        case LogLevel.ERROR:
          console.error(`❌ ${prefix}`, ...logData);
          break;
      }
    }
  }

  debug(message: string, context?: string, data?: any) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      this.addLog(LogLevel.DEBUG, message, context, data);
    }
  }

  info(message: string, context?: string, data?: any) {
    if (this.shouldLog(LogLevel.INFO)) {
      this.addLog(LogLevel.INFO, message, context, data);
    }
  }

  warn(message: string, context?: string, data?: any) {
    if (this.shouldLog(LogLevel.WARN)) {
      this.addLog(LogLevel.WARN, message, context, data);
    }
  }

  error(message: string, context?: string, data?: any) {
    if (this.shouldLog(LogLevel.ERROR)) {
      this.addLog(LogLevel.ERROR, message, context, data);
    }
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }

  // Export logs as string for debugging
  exportLogs(): string {
    return this.logs
      .map(log => {
        const level = LogLevel[log.level];
        const context = log.context ? `[${log.context}]` : '';
        const data = log.data ? ` | Data: ${JSON.stringify(log.data)}` : '';
        return `${log.timestamp.toISOString()} ${level} ${context} ${log.message}${data}`;
      })
      .join('\n');
  }
}

// Create singleton instance
export const logger = new Logger();

// Convenience functions
export const log = {
  debug: (message: string, context?: string, data?: any) => logger.debug(message, context, data),
  info: (message: string, context?: string, data?: any) => logger.info(message, context, data),
  warn: (message: string, context?: string, data?: any) => logger.warn(message, context, data),
  error: (message: string, context?: string, data?: any) => logger.error(message, context, data),
};

// Performance monitoring
export class PerformanceMonitor {
  private static timers: Map<string, number> = new Map();

  static start(label: string) {
    this.timers.set(label, Date.now());
    // Removed debug log
  }

  static end(label: string) {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.timers.delete(label);
      // Removed info log
      return duration;
    }
    // Removed warn log
    return 0;
  }

  static measure<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      const result = fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }

  static async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

// Error tracking
export const trackError = (error: Error, context?: string, additionalData?: any) => {
  log.error(error.message, context, {
    stack: error.stack,
    name: error.name,
    ...additionalData,
  });

  // In production, you might want to send this to a crash reporting service
  if (process.env.NODE_ENV === 'production') {
    // Example: Crashlytics.recordError(error);
  }
};

// Network request logging
export const logNetworkRequest = (url: string, method: string, status?: number, duration?: number) => {
  const message = `${method} ${url}${status ? ` - ${status}` : ''}${duration ? ` (${duration}ms)` : ''}`;
  if (status && status >= 400) {
    log.error(message, 'Network');
  } else {
    log.info(message, 'Network');
  }
};

export default logger;
