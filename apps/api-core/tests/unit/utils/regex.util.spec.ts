import { describe, it, expect } from 'vitest';
import { escapeRegex, buildSearchRegex } from '../../../src/common/utils/regex.util';

describe('regex.util', () => {
  describe('escapeRegex', () => {
    it('escapes regex metacharacters', () => {
      expect(escapeRegex('a.b*c+d?e[f]g(h)i')).toBe('a\\.b\\*c\\+d\\?e\\[f\\]g\\(h\\)i');
    });

    it('leaves plain text unchanged', () => {
      expect(escapeRegex('hello world')).toBe('hello world');
    });

    it('handles empty input', () => {
      expect(escapeRegex('')).toBe('');
    });
  });

  describe('buildSearchRegex', () => {
    it('creates a case-insensitive regex from plain text', () => {
      const regex = buildSearchRegex('Everbloom');
      expect(regex.test('everbloom solutions')).toBe(true);
      expect(regex.test('EVERBLOOM')).toBe(true);
      expect(regex.test('something else')).toBe(false);
    });

    it('escapes user-supplied regex special characters', () => {
      const regex = buildSearchRegex('EBR-2024-.*');
      expect(regex.test('EBR-2024-.*')).toBe(true);
      expect(regex.test('EBR-2024-123')).toBe(false);
    });
  });
});
