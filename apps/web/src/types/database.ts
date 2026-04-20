// Placeholder gerado manualmente. Após cada migração rodar `pnpm gen:types`.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TransactionKind = 'gasto' | 'entrada';
type CategoryKind = 'gasto' | 'entrada' | 'investimento';
type WorkspaceRole = 'owner' | 'editor' | 'viewer';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; nome: string; avatar_url: string | null; created_at: string };
        Insert: { id: string; nome: string; avatar_url?: string | null };
        Update: { nome?: string; avatar_url?: string | null };
      };
      workspaces: {
        Row: { id: string; nome: string; owner_id: string; created_at: string };
        Insert: { nome: string; owner_id: string };
        Update: { nome?: string };
      };
      workspace_members: {
        Row: { workspace_id: string; user_id: string; role: WorkspaceRole; joined_at: string };
        Insert: { workspace_id: string; user_id: string; role?: WorkspaceRole };
        Update: { role?: WorkspaceRole };
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
        Update: Partial<{ ativo: boolean; limite_parcelas: number; valor: number }>;
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
      };
      debts: {
        Row: {
          id: string;
          workspace_id: string;
          tipo: 'receber' | 'pagar';
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
          tipo: 'receber' | 'pagar';
          pessoa: string;
          valor_total: number;
          parcelas_total: number;
          descricao?: string | null;
          data_inicio: string;
          created_by: string;
        };
        Update: Partial<{ parcelas_pagas: number; quitada_em: string | null; descricao: string | null }>;
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
        Insert: never;
        Update: never;
      };
    };
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
  };
}
