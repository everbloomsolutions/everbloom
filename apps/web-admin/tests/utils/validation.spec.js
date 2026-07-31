import { describe, it, expect } from 'vitest';
import { validators, validateForm, schemas } from '../../src/utils/validation';

describe('validators', () => {
  describe('required', () => {
    it('returns null for non-empty values', () => {
      expect(validators.required('hello', 'Field')).toBeNull();
      expect(validators.required('  hello  ', 'Field')).toBeNull();
    });

    it('returns an error for empty values', () => {
      expect(validators.required('', 'Email')).toBe('Email is required');
      expect(validators.required('   ', 'Email')).toBe('Email is required');
      expect(validators.required(null, 'Email')).toBe('Email is required');
      expect(validators.required(undefined, 'Email')).toBe('Email is required');
    });
  });

  describe('email', () => {
    it('returns null for valid email addresses', () => {
      expect(validators.email('user@example.com')).toBeNull();
      expect(validators.email('user.name+tag@sub.example.co.uk')).toBeNull();
    });

    it('returns an error for invalid email addresses', () => {
      expect(validators.email('not-an-email')).toBe('Invalid email format');
      expect(validators.email('@example.com')).toBe('Invalid email format');
      expect(validators.email('user@')).toBe('Invalid email format');
      expect(validators.email('user@example')).toBe('Invalid email format');
    });

    it('allows empty values so required can be used separately', () => {
      expect(validators.email('')).toBeNull();
      expect(validators.email(null)).toBeNull();
      expect(validators.email(undefined)).toBeNull();
    });
  });

  describe('number', () => {
    it('returns null for valid numbers', () => {
      expect(validators.number('42', 'Weight')).toBeNull();
      expect(validators.number('3.14', 'Weight')).toBeNull();
      expect(validators.number(0, 'Weight')).toBeNull();
      expect(validators.number('-10', 'Weight')).toBeNull();
    });

    it('returns an error for non-numeric values', () => {
      expect(validators.number('abc', 'Weight')).toBe('Weight must be a valid number');
      expect(validators.number('12abc', 'Weight')).toBe('Weight must be a valid number');
      expect(validators.number(false, 'Weight')).toBe('Weight must be a valid number');
      expect(validators.number(' ', 'Weight')).toBe('Weight must be a valid number');
    });

    it('allows empty values so required can be used separately', () => {
      expect(validators.number('', 'Weight')).toBeNull();
      expect(validators.number(null, 'Weight')).toBeNull();
      expect(validators.number(undefined, 'Weight')).toBeNull();
    });
  });

  describe('positiveNumber', () => {
    it('returns null for positive numbers', () => {
      expect(validators.positiveNumber('5', 'Amount')).toBeNull();
      expect(validators.positiveNumber('0.1', 'Amount')).toBeNull();
    });

    it('returns an error for zero or negative numbers', () => {
      expect(validators.positiveNumber('0', 'Amount')).toBe('Amount must be a positive number');
      expect(validators.positiveNumber('-5', 'Amount')).toBe('Amount must be a positive number');
    });
  });

  describe('phone', () => {
    it('returns null for valid phone numbers', () => {
      expect(validators.phone('9876543210')).toBeNull();
      expect(validators.phone('+91 987-654-3210')).toBeNull();
      expect(validators.phone('(987) 654 3210')).toBeNull();
    });

    it('returns an error for invalid phone numbers', () => {
      expect(validators.phone('123')).toBe('Invalid phone number format');
      expect(validators.phone('abcdefghij')).toBe('Invalid phone number format');
      expect(validators.phone('123456789')).toBe('Invalid phone number format');
    });

    it('allows empty values so required can be used separately', () => {
      expect(validators.phone('')).toBeNull();
      expect(validators.phone(null)).toBeNull();
    });
  });

  describe('password', () => {
    it('returns null for strong passwords', () => {
      expect(validators.password('Password1')).toBeNull();
      expect(validators.password('A1b2c3d4')).toBeNull();
    });

    it('returns an error for weak passwords', () => {
      expect(validators.password('short1')).toBe('Password must be at least 8 characters');
      expect(validators.password('password')).toBe(
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      );
      expect(validators.password('PASSWORD1')).toBe(
        'Password must contain at least one lowercase letter, one uppercase letter, and one number'
      );
    });
  });

  describe('minLength / maxLength', () => {
    it('enforces minimum length', () => {
      expect(validators.minLength('ab', 3, 'Name')).toBe('Name must be at least 3 characters');
      expect(validators.minLength('abc', 3, 'Name')).toBeNull();
    });

    it('enforces maximum length', () => {
      expect(validators.maxLength('abcdef', 5, 'Name')).toBe('Name must be at most 5 characters');
      expect(validators.maxLength('abcde', 5, 'Name')).toBeNull();
    });
  });
});

describe('validateForm', () => {
  it('returns an empty object when there are no errors', () => {
    const data = { email: 'test@example.com', password: 'Password1' };
    const errors = validateForm(data, {
      email: schemas.email,
      password: schemas.password,
    });
    expect(errors).toEqual({});
  });

  it('collects errors for each invalid field', () => {
    const data = { email: 'invalid', password: 'short' };
    const errors = validateForm(data, {
      email: schemas.email,
      password: schemas.password,
    });
    expect(errors.email).toBe('Invalid email format');
    expect(errors.password).toBe('Password must be at least 8 characters');
  });
});
