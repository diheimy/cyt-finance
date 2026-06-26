import { describe, it, expect } from 'vitest';
import { savingsRate, debtBurden, cardUtilization } from './health-metrics';

describe('health-metrics', () => {
  it('savingsRate = (entradas - saidas) / entradas', () => {
    expect(savingsRate(1000, 700)).toBeCloseTo(0.3);
  });
  it('savingsRate 0 quando entradas = 0', () => {
    expect(savingsRate(0, 100)).toBe(0);
  });
  it('debtBurden = parcelasMensais / renda', () => {
    expect(debtBurden(300, 1500)).toBeCloseTo(0.2);
  });
  it('debtBurden 0 quando renda = 0', () => {
    expect(debtBurden(300, 0)).toBe(0);
  });
  it('cardUtilization = usado / limite', () => {
    expect(cardUtilization(400, 1000)).toBeCloseTo(0.4);
  });
  it('cardUtilization 0 quando limite = 0', () => {
    expect(cardUtilization(400, 0)).toBe(0);
  });
});
