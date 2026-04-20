import { z } from 'zod';

export const WorkspaceRole = z.enum(['owner', 'editor', 'viewer']);
export type WorkspaceRole = z.infer<typeof WorkspaceRole>;

export const TransactionKind = z.enum(['gasto', 'entrada']);
export type TransactionKind = z.infer<typeof TransactionKind>;

export const CategoryKind = z.enum(['gasto', 'entrada', 'investimento']);
export type CategoryKind = z.infer<typeof CategoryKind>;

export const DebtKind = z.enum(['receber', 'pagar']);
export type DebtKind = z.infer<typeof DebtKind>;

export const Uuid = z.string().uuid();
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar no formato YYYY-MM-DD');
export const PositiveMoney = z.number().positive().multipleOf(0.01);
