import { z } from 'zod';

export const UuidSchema = z.string().uuid();
export const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'data deve estar no formato YYYY-MM-DD');

export const TransactionKindSchema = z.enum(['gasto', 'entrada']);
export type TransactionKind = z.infer<typeof TransactionKindSchema>;

export const CategoryKindSchema = z.enum(['gasto', 'entrada', 'investimento']);
export type CategoryKind = z.infer<typeof CategoryKindSchema>;

/** Input para criar transação à vista (parcelamento em cartão vai em F3). */
export const TransactionInputSchema = z.object({
  workspace_id: UuidSchema,
  tipo: TransactionKindSchema,
  valor: z.number().positive('valor deve ser positivo').multipleOf(0.01),
  descricao: z.string().min(1, 'descrição obrigatória').max(200),
  data: IsoDateSchema,
  categoria_id: UuidSchema.nullable(),
  cartao_id: UuidSchema.nullable().default(null),
  paga: z.boolean().default(true)
});
export type TransactionInput = z.infer<typeof TransactionInputSchema>;

export const TransactionRowSchema = TransactionInputSchema.extend({
  id: UuidSchema,
  compra_id: UuidSchema.nullable(),
  parcela_atual: z.number().int().positive(),
  parcelas_total: z.number().int().positive(),
  recurring_id: UuidSchema.nullable(),
  created_by: UuidSchema,
  created_at: z.string()
});
export type TransactionRow = z.infer<typeof TransactionRowSchema>;

export const CategorySchema = z.object({
  id: UuidSchema,
  workspace_id: UuidSchema,
  nome: z.string(),
  tipo: CategoryKindSchema,
  cor: z.string().nullable(),
  icone: z.string().nullable()
});
export type Category = z.infer<typeof CategorySchema>;

/** Filtros da listagem. */
export const TransactionFiltersSchema = z.object({
  workspace_id: UuidSchema,
  month: z.string().regex(/^\d{4}-\d{2}$/),
  tipo: TransactionKindSchema.optional(),
  categoria_id: UuidSchema.optional(),
  cartao_id: UuidSchema.optional(),
  search: z.string().trim().optional()
});
export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;
