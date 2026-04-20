import { describe, it, expect } from 'vitest';
import { formatMoney, formatDateBR, monthBounds, parseMoneyInput } from './format';

describe('formatMoney', () => {
  it('formats BRL with 2 decimals', () => {
    expect(formatMoney(1234.5)).toMatch(/R\$\s*1\.234,50/);
  });
  it('handles zero', () => {
    expect(formatMoney(0)).toMatch(/R\$\s*0,00/);
  });
  it('handles string input', () => {
    expect(formatMoney('99.99')).toMatch(/R\$\s*99,99/);
  });
});

describe('formatDateBR', () => {
  it('formats ISO date to DD/MM/YYYY', () => {
    expect(formatDateBR('2026-04-20')).toBe('20/04/2026');
  });
});

describe('monthBounds', () => {
  it('returns first and last day of month', () => {
    const { start, end } = monthBounds('2026-04');
    expect(start).toBe('2026-04-01');
    expect(end).toBe('2026-04-30');
  });
  it('handles February leap year', () => {
    const { start, end } = monthBounds('2024-02');
    expect(start).toBe('2024-02-01');
    expect(end).toBe('2024-02-29');
  });
});

describe('parseMoneyInput', () => {
  it('parses BR format 1.234,56', () => {
    expect(parseMoneyInput('1.234,56')).toBe(1234.56);
  });
  it('parses plain decimal', () => {
    expect(parseMoneyInput('99,99')).toBe(99.99);
  });
  it('throws on invalid input', () => {
    expect(() => parseMoneyInput('abc')).toThrow();
  });
});
