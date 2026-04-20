import { describe, it, expect } from 'vitest';
import {
  caixaAcumulado,
  historyMonths,
  leakageByCategory,
  monthlyBars,
  monthTotals,
  type TxLite
} from './aggregate';

function tx(partial: Partial<TxLite> = {}): TxLite {
  return {
    tipo: 'gasto',
    valor: 100,
    data: '2026-04-15',
    paga: true,
    categoria_id: null,
    categoria_nome: null,
    categoria_cor: null,
    ...partial
  };
}

describe('monthTotals', () => {
  it('sums paid entradas and saidas', () => {
    const rows: TxLite[] = [
      tx({ tipo: 'entrada', valor: 5000 }),
      tx({ tipo: 'gasto', valor: 1200 }),
      tx({ tipo: 'gasto', valor: 300 })
    ];
    expect(monthTotals(rows)).toEqual({ entradas: 5000, saidas: 1500, resultado: 3500 });
  });

  it('ignores unpaid rows (e.g., cartão pendente)', () => {
    const rows: TxLite[] = [tx({ tipo: 'gasto', valor: 1000, paga: false })];
    expect(monthTotals(rows)).toEqual({ entradas: 0, saidas: 0, resultado: 0 });
  });

  it('handles string valor', () => {
    const rows: TxLite[] = [tx({ tipo: 'entrada', valor: '99.99' })];
    expect(monthTotals(rows).entradas).toBe(99.99);
  });
});

describe('caixaAcumulado', () => {
  it('sums paid entradas minus saidas up to target date', () => {
    const rows: TxLite[] = [
      tx({ tipo: 'entrada', valor: 1000, data: '2026-01-10' }),
      tx({ tipo: 'gasto', valor: 300, data: '2026-02-05' }),
      tx({ tipo: 'entrada', valor: 500, data: '2026-03-01' })
    ];
    expect(caixaAcumulado(rows, '2026-02-28')).toBe(700);
    expect(caixaAcumulado(rows, '2026-12-31')).toBe(1200);
  });

  it('ignores unpaid', () => {
    const rows: TxLite[] = [tx({ tipo: 'entrada', valor: 500, paga: false })];
    expect(caixaAcumulado(rows, '2026-12-31')).toBe(0);
  });
});

describe('monthlyBars', () => {
  it('returns 6 months ending at reference', () => {
    const rows: TxLite[] = [
      tx({ tipo: 'entrada', valor: 100, data: '2026-01-15' }),
      tx({ tipo: 'gasto', valor: 50, data: '2026-03-20' }),
      tx({ tipo: 'entrada', valor: 200, data: '2026-04-10' })
    ];
    const bars = monthlyBars(rows, '2026-04');
    expect(bars.map((b) => b.month)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04'
    ]);
    expect(bars.find((b) => b.month === '2026-01')).toEqual({
      month: '2026-01',
      entradas: 100,
      saidas: 0
    });
    expect(bars.find((b) => b.month === '2026-04')).toEqual({
      month: '2026-04',
      entradas: 200,
      saidas: 0
    });
  });
});

describe('leakageByCategory', () => {
  it('groups gastos by category and sorts desc', () => {
    const rows: TxLite[] = [
      tx({
        tipo: 'gasto',
        valor: 200,
        categoria_id: 'cat-a',
        categoria_nome: 'Alimentação',
        categoria_cor: '#f59e0b',
        data: '2026-04-10'
      }),
      tx({
        tipo: 'gasto',
        valor: 800,
        categoria_id: 'cat-b',
        categoria_nome: 'Moradia',
        categoria_cor: '#8b5cf6',
        data: '2026-04-15'
      }),
      tx({
        tipo: 'gasto',
        valor: 100,
        categoria_id: null,
        data: '2026-04-20'
      }),
      tx({ tipo: 'entrada', valor: 5000, data: '2026-04-01' }) // não conta
    ];
    const slices = leakageByCategory(rows, '2026-04');
    expect(slices).toHaveLength(3);
    expect(slices[0]).toMatchObject({ categoriaNome: 'Moradia', valor: 800 });
    expect(slices[1]).toMatchObject({ categoriaNome: 'Alimentação', valor: 200 });
    expect(slices[2]).toMatchObject({ categoriaNome: 'Sem categoria', valor: 100 });
    const totalPct = slices.reduce((acc, s) => acc + s.percent, 0);
    expect(Math.round(totalPct)).toBeGreaterThanOrEqual(99);
    expect(Math.round(totalPct)).toBeLessThanOrEqual(101);
  });

  it('returns empty array when no gastos in month', () => {
    expect(leakageByCategory([], '2026-04')).toEqual([]);
  });
});

describe('historyMonths', () => {
  it('computes running caixa across window', () => {
    const rows: TxLite[] = [
      tx({ tipo: 'entrada', valor: 1000, data: '2026-01-10' }),
      tx({ tipo: 'gasto', valor: 400, data: '2026-02-15' }),
      tx({ tipo: 'entrada', valor: 500, data: '2026-04-05' })
    ];
    const hist = historyMonths(rows, '2026-04', 4);
    expect(hist).toHaveLength(4);
    const abril = hist.find((h) => h.month === '2026-04')!;
    const fev = hist.find((h) => h.month === '2026-02')!;
    expect(fev.caixaAcumulado).toBe(600); // 1000 - 400
    expect(abril.caixaAcumulado).toBe(1100); // 600 + 500
  });
});
