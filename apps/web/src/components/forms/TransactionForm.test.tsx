import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import TransactionForm from './TransactionForm';

function wrap(ui: ReactNode) {
  const qc = new QueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('TransactionForm edit mode', () => {
  it('pré-preenche descrição quando recebe initialValues', () => {
    wrap(
      <TransactionForm
        workspaceId="ws-1"
        mode="edit"
        initialValues={{
          id: 'tx-1',
          tipo: 'gasto',
          valor: 12.5,
          descricao: 'Mercado',
          data: '2026-06-01',
          categoria_id: null
        }}
      />
    );
    expect(screen.getByDisplayValue('Mercado')).toBeInTheDocument();
  });
});
