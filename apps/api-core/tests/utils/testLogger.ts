/**
 * Test logger utility for backend tests
 * Wraps the main logger with test-specific context
 * Respects LOG_LEVEL env var (defaults to debug in test environment)
 */

import { createLogger } from '../../src/infrastructure/logger';

const logger = createLogger();

interface TestContext {
  testName?: string;
  suite?: string;
  status?: 'running' | 'passed' | 'failed' | 'skipped';
  duration?: number;
  [key: string]: unknown;
}

class TestLogger {
  private currentTest: string | null = null;
  private currentSuite: string | null = null;

  /**
   * Set current test context
   */
  setContext(testName: string, suite?: string): void {
    this.currentTest = testName;
    this.currentSuite = suite || null;
  }

  /**
   * Clear test context
   */
  clearContext(): void {
    this.currentTest = null;
    this.currentSuite = null;
  }

  /**
   * Format message with test context
   */
  private formatMessage(message: string, context?: TestContext): string {
    const parts: string[] = [];
    
    if (this.currentSuite) {
      parts.push(`[${this.currentSuite}]`);
    }
    if (this.currentTest) {
      parts.push(`[${this.currentTest}]`);
    }
    parts.push(message);
    
    const fullMessage = parts.join(' ');
    
    if (context && Object.keys(context).length > 0) {
      return `${fullMessage} ${JSON.stringify(context)}`;
    }
    
    return fullMessage;
  }

  /**
   * Log an error (always logged)
   */
  error(message: string, context?: TestContext): void {
    logger.error(this.formatMessage(message, context));
  }

  /**
   * Log a warning
   */
  warn(message: string, context?: TestContext): void {
    logger.warn(this.formatMessage(message, context));
  }

  /**
   * Log informational message
   */
  info(message: string, context?: TestContext): void {
    logger.info(this.formatMessage(message, context));
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: TestContext): void {
    logger.debug(this.formatMessage(message, context));
  }

  /**
   * Log test start
   */
  testStart(testName: string, suite?: string, context?: TestContext): void {
    this.setContext(testName, suite);
    this.info('Test started', { ...context, status: 'running' });
  }

  /**
   * Log test end
   */
  testEnd(testName: string, status: 'passed' | 'failed' | 'skipped', duration?: number, context?: TestContext): void {
    this.info('Test completed', { ...context, status, duration });
  }

  /**
   * Log test error
   */
  testError(testName: string, error: Error | unknown, context?: TestContext): void {
    const errorContext: TestContext = {
      ...context,
      status: 'failed',
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      } : String(error),
    };
    this.error(`Test failed: ${testName}`, errorContext);
  }

  /**
   * Log assertion result
   */
  assertion(description: string, passed: boolean, details?: TestContext): void {
    if (passed) {
      this.debug(`Assertion passed: ${description}`, details);
    } else {
      this.warn(`Assertion failed: ${description}`, details);
    }
  }

  /**
   * Log test step
   */
  step(stepName: string, context?: TestContext): void {
    this.debug(`Test step: ${stepName}`, context);
  }
}

export const testLogger = new TestLogger();
export default testLogger;

