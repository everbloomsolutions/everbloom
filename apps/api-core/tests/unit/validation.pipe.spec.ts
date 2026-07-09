/**
 * Validation Pipe Unit Tests (NestJS)
 * Tests NestJS ValidationPipe for request validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator';

// Test DTO
class TestDto {
  @IsString()
  @MinLength(3)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  optional?: string;
}

describe('ValidationPipe (NestJS)', () => {
  let validationPipe: ValidationPipe;

  beforeEach(() => {
    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('transform', () => {
    it('should pass validation for valid data', async () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
      };

      const result = await validationPipe.transform(validData, {
        type: 'body',
        metatype: TestDto,
      } as any);

      expect(result).toBeDefined();
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
    });

    it('should throw BadRequestException for invalid email', async () => {
      const invalidData = {
        name: 'John Doe',
        email: 'invalid-email',
      };

      await expect(
        validationPipe.transform(invalidData, {
          type: 'body',
          metatype: TestDto,
        } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for name too short', async () => {
      const invalidData = {
        name: 'Jo',
        email: 'john@example.com',
      };

      await expect(
        validationPipe.transform(invalidData, {
          type: 'body',
          metatype: TestDto,
        } as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow optional fields', async () => {
      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        optional: 'optional value',
      };

      const result = await validationPipe.transform(validData, {
        type: 'body',
        metatype: TestDto,
      } as any);

      expect(result.optional).toBe('optional value');
    });

    it('should remove non-whitelisted properties', async () => {
      const dataWithExtra = {
        name: 'John Doe',
        email: 'john@example.com',
        extraField: 'should be removed',
      };

      const result = await validationPipe.transform(dataWithExtra, {
        type: 'body',
        metatype: TestDto,
      } as any);

      expect(result).not.toHaveProperty('extraField');
    });
  });

  describe('class-validator integration', () => {
    it('should validate DTO using class-validator', async () => {
      const invalidDto = plainToInstance(TestDto, {
        name: 'Jo', // Too short
        email: 'invalid-email',
      });

      const errors = await validate(invalidDto);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should pass validation for valid DTO', async () => {
      const validDto = plainToInstance(TestDto, {
        name: 'John Doe',
        email: 'john@example.com',
      });

      const errors = await validate(validDto);
      expect(errors.length).toBe(0);
    });
  });
});
