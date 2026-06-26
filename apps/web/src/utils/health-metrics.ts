export function savingsRate(entradas: number, saidas: number): number {
  if (entradas <= 0) return 0;
  return (entradas - saidas) / entradas;
}

export function debtBurden(parcelasMensais: number, renda: number): number {
  if (renda <= 0) return 0;
  return parcelasMensais / renda;
}

export function cardUtilization(usado: number, limite: number): number {
  if (limite <= 0) return 0;
  return usado / limite;
}
