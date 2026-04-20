import { describe, it, expect } from 'vitest';
import { TransactionInputSchema, IsoDateSchema } from './schemas';

describe('TransactionInputSchema', () => {
  const validBase = {
    workspace_id: '11111111-1111-1111-1111-111111111111',
    tipo: 'gasto' as const,
    valor: 100.5,
    descricao: 'Mercado',
    data: '2026-04-20',
    categoria_id: null,
    cartao_id: null,
    paga: true
  };

  it('accepts valid gasto', () => {
    expect(() => TransactionInputSchema.parse(validBase)).not.toThrow();
  });

  it('rejects negative valor', () => {
    expect(() => TransactionInputSchema.parse({ ...validBase, valor: -1 })).toThrow();
  });

  it('rejects invalid date format', () => {
    expect(() => TransactionInputSchema.parse({ ...validBase, data: '20/04/2026' })).toThrow();
  });

  it('rejects empty descricao', () => {
    expect(() => TransactionInputSchema.parse({ ...validBase, descricao: '' })).toThrow();
  });

  it('rejects invalid tipo', () => {
    expect(() => TransactionInputSchema.parse({ ...validBase, tipo: 'investimento' })).toThrow();
  });
});

describe('IsoDateSchema', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(IsoDateSchema.parse('2026-04-20')).toBe('2026-04-20');
  });
  it('rejects BR format', () => {
    expect(() => IsoDateSchema.parse('20/04/2026')).toThrow();
  });
});
