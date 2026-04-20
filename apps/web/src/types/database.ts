// Placeholder manual. Após cada migração rodar `pnpm gen:types` para sobrescrever
// com tipos gerados diretamente do schema Supabase.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type TransactionKind = 'gasto' | 'entrada';
type CategoryKind = 'gasto' | 'entrada' | 'investimento';
type WorkspaceRole = 'owner' | 'editor' | 'viewer';
type DebtKind = 'receber' | 'pagar';

type EmptyRelationships = [];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; nome: string; avatar_url: string | null; created_at: string };
        Insert: { id: string; nome: string; avatar_url?: string | null };
        Update: { nome?: string; avatar_url?: string | null };
        Relationships: EmptyRelationships;
      };
      workspaces: {
        Row: { id: string; nome: string; owner_id: string; created_at: string };
        Insert: { nome: string; owner_id: string };
        Update: { nome?: string };
        Relationships: EmptyRelationships;
      };
      workspace_members: {
        Row: { workspace_id: string; user_id: string; role: WorkspaceRole; joined_at: string };
        Insert: { workspace_id: string; user_id: string; role?: WorkspaceRole };
        Update: { role?: WorkspaceRole };
        Relationships: EmptyRelationships;
      };
      invites: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          token: string;
          expires_at: string;
          accepted_at: string | null;
          invited_by: string;
          created_at: string;
        };
        Insert: { workspace_id: string; email: string; invited_by: string };
        Update: { accepted_at?: string | null };
        Relationships: EmptyRelationships;
      };
      cards: {
        Row: {
          id: string;
          workspace_id: string;
          nome: string;
          ultimos_digitos: string;
          dia_fechamento: number;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          nome: string;
          ultimos_digitos: string;
          dia_fechamento: number;
        };
        Update: Partial<{ nome: string; ultimos_digitos: string; dia_fechamento: number }>;
        Relationships: EmptyRelationships;
      };
      categories: {
        Row: {
          id: string;
          workspace_id: string;
          nome: string;
          tipo: CategoryKind;
          cor: string | null;
          icone: string | null;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          nome: string;
          tipo: CategoryKind;
          cor?: string | null;
          icone?: string | null;
        };
        Update: Partial<{
          nome: string;
          tipo: CategoryKind;
          cor: string | null;
          icone: string | null;
        }>;
        Relationships: EmptyRelationships;
      };
      transactions: {
        Row: {
          id: string;
          workspace_id: string;
          tipo: TransactionKind;
          valor: number;
          descricao: string;
          data: string;
          categoria_id: string | null;
          cartao_id: string | null;
          compra_id: string | null;
          parcela_atual: number;
          parcelas_total: number;
          paga: boolean;
          recurring_id: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          tipo: TransactionKind;
          valor: number;
          descricao: string;
          data: string;
          categoria_id?: string | null;
          cartao_id?: string | null;
          compra_id?: string | null;
          parcela_atual?: number;
          parcelas_total?: number;
          paga?: boolean;
          recurring_id?: string | null;
          created_by: string;
        };
        Update: Partial<{
          tipo: TransactionKind;
          valor: number;
          descricao: string;
          data: string;
          categoria_id: string | null;
          cartao_id: string | null;
          paga: boolean;
        }>;
        Relationships: EmptyRelationships;
      };
      recurring: {
        Row: {
          id: string;
          workspace_id: string;
          tipo: TransactionKind;
          valor: number;
          descricao: string;
          categoria_id: string | null;
          data_inicio: string;
          limite_parcelas: number;
          parcelas_materializadas: number;
          ativo: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          tipo: TransactionKind;
          valor: number;
          descricao: string;
          categoria_id?: string | null;
          data_inicio: string;
          limite_parcelas?: number;
          created_by: string;
        };
        Update: Partial<{ ativo: boolean; limite_parcelas: number; valor: number; descricao: string }>;
        Relationships: EmptyRelationships;
      };
      investments: {
        Row: {
          id: string;
          workspace_id: string;
          valor: number;
          descricao: string;
          categoria: string;
          data: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          valor: number;
          descricao: string;
          categoria: string;
          data: string;
          created_by: string;
        };
        Update: Partial<{ valor: number; descricao: string; categoria: string; data: string }>;
        Relationships: EmptyRelationships;
      };
      debts: {
        Row: {
          id: string;
          workspace_id: string;
          tipo: DebtKind;
          pessoa: string;
          valor_total: number;
          parcelas_total: number;
          parcelas_pagas: number;
          descricao: string | null;
          data_inicio: string;
          quitada_em: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          tipo: DebtKind;
          pessoa: string;
          valor_total: number;
          parcelas_total: number;
          descricao?: string | null;
          data_inicio: string;
          created_by: string;
        };
        Update: Partial<{
          parcelas_pagas: number;
          quitada_em: string | null;
          descricao: string | null;
        }>;
        Relationships: EmptyRelationships;
      };
      audit_logs: {
        Row: {
          id: number;
          workspace_id: string;
          user_id: string | null;
          acao: string;
          entidade: string;
          entidade_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          workspace_id: string;
          user_id?: string | null;
          acao: string;
          entidade: string;
          entidade_id?: string | null;
          payload?: Json;
        };
        Update: never;
        Relationships: EmptyRelationships;
      };
    };
    Views: Record<string, never>;
    Functions: {
      accept_invite: {
        Args: { p_token: string };
        Returns: { id: string; nome: string; owner_id: string; created_at: string };
      };
      create_installments: {
        Args: {
          p_workspace_id: string;
          p_cartao_id: string;
          p_valor_total: number;
          p_parcelas: number;
          p_descricao: string;
          p_categoria_id: string | null;
          p_data_compra: string;
        };
        Returns: string;
      };
    };
    Enums: {
      workspace_role: WorkspaceRole;
      category_kind: CategoryKind;
      transaction_kind: TransactionKind;
      debt_kind: DebtKind;
    };
    CompositeTypes: Record<string, never>;
  };
}
