import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthCard } from './HealthCard';

describe('HealthCard', () => {
  it('mostra score e pontos de atenção', () => {
    render(
      <HealthCard
        report={{
          score: 65,
          nivel: 'atencao',
          positivos: ['Poupa 20%'],
          atencao: ['Cartão alto'],
          recomendacoes: ['Pagar fatura']
        }}
        loading={false}
        onAnalyze={() => {}}
      />
    );
    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('• Cartão alto')).toBeInTheDocument();
  });

  it('mostra estado vazio com botão Analisar quando report é null', () => {
    render(<HealthCard report={null} loading={false} onAnalyze={() => {}} />);
    expect(screen.getByRole('button', { name: /analisar agora/i })).toBeInTheDocument();
  });
});
