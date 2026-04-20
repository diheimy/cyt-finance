/**
 * Agregações do dashboard — puras, sem I/O, testáveis isoladamente.
 */

export interface TxLite {
  tipo: 'gasto' | 'entrada';
  valor: number | string;
  data: string;
  paga: boolean;
  categoria_id: string | null;
  categoria_nome?: string | null;
  categoria_cor?: string | null;
}

export interface MonthTotals {
  entradas: number;
  saidas: number;
  resultado: number;
}

const toNumber = (v: number | string): number => (typeof v === 'string' ? Number(v) : v);

/** Soma entradas e saídas PAGAS do mês. Parcelas de cartão não-pagas não contam. */
export function monthTotals(txs: TxLite[]): MonthTotals {
  let entradas = 0;
  let saidas = 0;
  for (const t of txs) {
    if (!t.paga) continue;
    const v = toNumber(t.valor);
    if (!Number.isFinite(v)) continue;
    if (t.tipo === 'entrada') entradas += v;
    else saidas += v;
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    entradas: round(entradas),
    saidas: round(saidas),
    resultado: round(entradas - saidas)
  };
}

/** Saldo acumulado: soma de todas as transações pagas até (e incluindo) dataAlvo. */
export function caixaAcumulado(txs: TxLite[], dataAlvo?: string): number {
  const limite = dataAlvo ?? new Date().toISOString().slice(0, 10);
  let saldo = 0;
  for (const t of txs) {
    if (!t.paga) continue;
    if (t.data > limite) continue;
    const v = toNumber(t.valor);
    if (!Number.isFinite(v)) continue;
    saldo += t.tipo === 'entrada' ? v : -v;
  }
  return Math.round(saldo * 100) / 100;
}

export interface BarPoint {
  month: string; // YYYY-MM
  entradas: number;
  saidas: number;
}

/** Agrupa transações pagas por mês YYYY-MM. Retorna 6 meses consecutivos terminando em referenceMonth. */
export function monthlyBars(txs: TxLite[], referenceMonth: string, monthsBack = 6): BarPoint[] {
  const buckets = new Map<string, { entradas: number; saidas: number }>();
  const [rY, rM] = referenceMonth.split('-').map(Number);

  // Inicializa 6 meses em ordem (do mais antigo para o mais recente)
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(rY, rM - 1 - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { entradas: 0, saidas: 0 });
  }

  for (const t of txs) {
    if (!t.paga) continue;
    const key = t.data.slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    const v = toNumber(t.valor);
    if (!Number.isFinite(v)) continue;
    if (t.tipo === 'entrada') bucket.entradas += v;
    else bucket.saidas += v;
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return Array.from(buckets.entries()).map(([month, v]) => ({
    month,
    entradas: round(v.entradas),
    saidas: round(v.saidas)
  }));
}

export interface CategorySlice {
  categoriaId: string | null;
  categoriaNome: string;
  cor: string;
  valor: number;
  percent: number;
}

/** Gastos pagos do mês agrupados por categoria (ordenado desc). */
export function leakageByCategory(txs: TxLite[], referenceMonth: string): CategorySlice[] {
  const target = txs.filter(
    (t) => t.paga && t.tipo === 'gasto' && t.data.slice(0, 7) === referenceMonth
  );
  if (target.length === 0) return [];

  const map = new Map<string, { nome: string; cor: string; valor: number }>();
  for (const t of target) {
    const key = t.categoria_id ?? '__sem_categoria__';
    const existing = map.get(key);
    const v = toNumber(t.valor);
    if (!Number.isFinite(v)) continue;
    if (existing) {
      existing.valor += v;
    } else {
      map.set(key, {
        nome: t.categoria_nome ?? 'Sem categoria',
        cor: t.categoria_cor ?? '#64748b',
        valor: v
      });
    }
  }

  const total = Array.from(map.values()).reduce((acc, v) => acc + v.valor, 0);
  const round = (n: number) => Math.round(n * 100) / 100;

  return Array.from(map.entries())
    .map(([id, v]) => ({
      categoriaId: id === '__sem_categoria__' ? null : id,
      categoriaNome: v.nome,
      cor: v.cor,
      valor: round(v.valor),
      percent: total > 0 ? Math.round((v.valor / total) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.valor - a.valor);
}

export interface HistoryRow {
  month: string;
  entradas: number;
  saidas: number;
  resultado: number;
  caixaAcumulado: number;
}

/** Últimos N meses com resultado + caixa acumulado running. */
export function historyMonths(txs: TxLite[], referenceMonth: string, monthsBack = 12): HistoryRow[] {
  const bars = monthlyBars(txs, referenceMonth, monthsBack);
  let running = 0;
  // Caixa acumulado ANTES do primeiro mês da janela
  const firstMonth = bars[0]?.month;
  if (firstMonth) {
    running = txs
      .filter((t) => t.paga && t.data.slice(0, 7) < firstMonth)
      .reduce((acc, t) => acc + (t.tipo === 'entrada' ? toNumber(t.valor) : -toNumber(t.valor)), 0);
  }
  return bars.map((b) => {
    const resultado = b.entradas - b.saidas;
    running += resultado;
    return {
      month: b.month,
      entradas: b.entradas,
      saidas: b.saidas,
      resultado: Math.round(resultado * 100) / 100,
      caixaAcumulado: Math.round(running * 100) / 100
    };
  });
}
