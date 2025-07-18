// Tests for logger service
import { log, trackError, PerformanceMonitor } from '../logger';

// Mock console methods
const mockConsole = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

// Replace console methods
Object.assign(console, mockConsole);

describe('Logger Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    Object.values(mockConsole).forEach(mock => mock.mockClear());
  });

  describe('log', () => {
    it('should log debug messages', () => {
      log.debug('Test debug message', 'TestComponent');
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('TestComponent'),
        expect.stringContaining('Test debug message')
      );
    });

    it('should log info messages', () => {
      log.info('Test info message', 'TestComponent');
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('TestComponent'),
        expect.stringContaining('Test info message')
      );
    });

    it('should log warn messages', () => {
      log.warn('Test warning message', 'TestComponent');
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        expect.stringContaining('TestComponent'),
        expect.stringContaining('Test warning message')
      );
    });

    it('should log error messages', () => {
      log.error('Test error message', 'TestComponent');
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining('TestComponent'),
        expect.stringContaining('Test error message')
      );
    });

    it('should include metadata in log messages', () => {
      const metadata = { userId: '123', action: 'test' };
      log.info('Test with metadata', 'TestComponent', metadata);
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('TestComponent'),
        expect.stringContaining('Test with metadata'),
        expect.stringContaining(JSON.stringify(metadata))
      );
    });

    it('should handle undefined metadata gracefully', () => {
      log.info('Test without metadata', 'TestComponent');
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('TestComponent'),
        expect.stringContaining('Test without metadata')
      );
    });
  });

  describe('trackError', () => {
    it('should track errors with context', () => {
      const error = new Error('Test error');
      const context = 'TestComponent';
      const metadata = { userId: '123' };

      trackError(error, context, metadata);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining(context),
        expect.stringContaining('Test error'),
        expect.stringContaining(JSON.stringify(metadata))
      );
    });

    it('should handle errors without metadata', () => {
      const error = new Error('Test error');
      const context = 'TestComponent';

      trackError(error, context);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining(context),
        expect.stringContaining('Test error')
      );
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';
      const context = 'TestComponent';

      trackError(error as any, context);

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('[ERROR]'),
        expect.stringContaining(context),
        expect.stringContaining('String error')
      );
    });
  });

  describe('PerformanceMonitor', () => {
    beforeEach(() => {
      jest.clearAllTimers();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should measure synchronous operations', () => {
      const testFunction = jest.fn(() => 'result');
      const result = PerformanceMonitor.measure('test-operation', testFunction);

      expect(testFunction).toHaveBeenCalled();
      expect(result).toBe('result');
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('Performance'),
        expect.stringContaining('Performance timer started: test-operation')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Performance'),
        expect.stringContaining('Performance timer ended: test-operation took')
      );
    });

    it('should measure asynchronous operations', async () => {
      const testFunction = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'async result';
      });

      const resultPromise = PerformanceMonitor.measureAsync('async-test-operation', testFunction);
      
      // Fast-forward time
      jest.advanceTimersByTime(100);
      
      const result = await resultPromise;

      expect(testFunction).toHaveBeenCalled();
      expect(result).toBe('async result');
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('Performance'),
        expect.stringContaining('Performance timer started: async-test-operation')
      );
    });

    it('should handle errors in measured operations', () => {
      const testFunction = jest.fn(() => {
        throw new Error('Test error');
      });

      expect(() => {
        PerformanceMonitor.measure('error-operation', testFunction);
      }).toThrow('Test error');

      expect(testFunction).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('Performance'),
        expect.stringContaining('Performance timer started: error-operation')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Performance'),
        expect.stringContaining('Performance timer ended: error-operation took')
      );
    });

    it('should handle errors in async measured operations', async () => {
      const testFunction = jest.fn(async () => {
        throw new Error('Async test error');
      });

      await expect(
        PerformanceMonitor.measureAsync('async-error-operation', testFunction)
      ).rejects.toThrow('Async test error');

      expect(testFunction).toHaveBeenCalled();
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('Performance'),
        expect.stringContaining('Performance timer started: async-error-operation')
      );
    });

    it('should start and end timers manually', () => {
      PerformanceMonitor.start('manual-timer');
      
      expect(mockConsole.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.stringContaining('Performance'),
        expect.stringContaining('Performance timer started: manual-timer')
      );

      // Advance time
      jest.advanceTimersByTime(50);

      const duration = PerformanceMonitor.end('manual-timer');

      expect(duration).toBeGreaterThan(0);
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('Performance'),
        expect.stringContaining('Performance timer ended: manual-timer took')
      );
    });

    it('should handle ending non-existent timers', () => {
      const duration = PerformanceMonitor.end('non-existent-timer');

      expect(duration).toBe(0);
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringContaining('[WARN]'),
        expect.stringContaining('Performance'),
        expect.stringContaining('Performance timer not found: non-existent-timer')
      );
    });
  });

  describe('Log Levels', () => {
    it('should respect log levels in production', () => {
      // Mock production environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      // Debug messages should be suppressed in production
      log.debug('Debug message', 'TestComponent');
      
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Log Formatting', () => {
    it('should format timestamps correctly', () => {
      const fixedDate = new Date('2023-01-01T12:00:00.000Z');
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate as any);

      log.info('Test message', 'TestComponent');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('2023-01-01T12:00:00.000Z'),
        expect.stringContaining('[INFO]'),
        expect.stringContaining('TestComponent'),
        expect.stringContaining('Test message')
      );

      (global.Date as any).mockRestore();
    });

    it('should handle long component names', () => {
      const longComponentName = 'VeryLongComponentNameThatExceedsNormalLength';
      log.info('Test message', longComponentName);

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining(longComponentName),
        expect.stringContaining('Test message')
      );
    });

    it('should handle special characters in messages', () => {
      const messageWithSpecialChars = 'Message with "quotes" and \n newlines';
      log.info(messageWithSpecialChars, 'TestComponent');

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[INFO]'),
        expect.stringContaining('TestComponent'),
        expect.stringContaining(messageWithSpecialChars)
      );
    });
  });
});
