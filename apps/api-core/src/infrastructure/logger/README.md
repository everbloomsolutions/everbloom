# Logger Module

A production-ready logging solution using design patterns for environment-specific behavior.

## Design Patterns

- **Strategy Pattern**: Different logging strategies for development and production
- **Factory Pattern**: Creates appropriate logger based on environment
- **Adapter Pattern**: Adapts to NestJS LoggerService interface
- **Dependency Injection**: Injectable service throughout the application

## Features

### Development Environment
- ✅ Pretty, colored console output
- ✅ Detailed timestamps with milliseconds
- ✅ Human-readable formatting
- ✅ All log levels enabled (error, warn, info, debug)
- ✅ Context formatting for readability

### Production Environment
- ✅ Structured JSON output (machine-readable)
- ✅ Minimal, performance-optimized
- ✅ Configurable log levels (default: info and above)
- ✅ ISO timestamp format
- ✅ Context as structured data
- ✅ Optional debug mode via `ENABLE_DEBUG=true`

## Usage

### In NestJS Services/Controllers (Recommended)

```typescript
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class MyService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('MyService');
  }

  doSomething() {
    this.logger.log('Processing request');
    this.logger.debug('Debug information', { userId: '123' });
    this.logger.warn('Warning message', { reason: 'low balance' });
    this.logger.error('Error occurred', 'stack trace here', 'MyService');
  }
}
```

### Outside NestJS (Standalone)

```typescript
import { createLogger } from './common/logger';

const logger = createLogger();
logger.info('Application started');
logger.error('Error occurred', { error: err });
```

### With Custom Environment

```typescript
import { createLogger } from './common/logger';

// Development logger
const devLogger = createLogger('development');

// Production logger with custom log level
const prodLogger = createLogger('production', 'warn');

// Production logger with debug enabled
const debugLogger = createLogger('production', 'info', true);
```

## Environment Variables

- `NODE_ENV`: Environment (development, production, test)
- `LOG_LEVEL`: Minimum log level (error, warn, info, debug, verbose)
- `ENABLE_DEBUG`: Enable debug logs in production (true/false)

## Log Levels

- `ERROR` (0): Critical errors only
- `WARN` (1): Warnings and errors
- `INFO` (2): Informational messages (default in production)
- `DEBUG` (3): Debug information (default in development)
- `VERBOSE` (4): Very detailed logging

## Migration from Old Logger

The old logger is still available for backward compatibility:

```typescript
// Old way (still works)
import { logger } from './core/middleware/logger';
logger.info('Message');

// New way (recommended)
import { LoggerService } from './common/logger/logger.service';
// Inject via constructor in NestJS services
```

## Examples

### Development Output
```
[14:23:45.123] [INFO] Server running on http://localhost:8080
[14:23:45.124] [DEBUG] Database connection established {
  "host": "localhost",
  "port": 27017
}
```

### Production Output
```json
{"timestamp":"2026-01-27T14:23:45.123Z","level":"INFO","message":"Server running on http://0.0.0.0:8080"}
{"timestamp":"2026-01-27T14:23:45.124Z","level":"ERROR","message":"Database connection failed","context":{"host":"localhost","port":27017}}
```
