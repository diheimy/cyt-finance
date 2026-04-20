import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const moneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

export const formatMoney = (valor: number | string): string => {
  const n = typeof valor === 'string' ? Number(valor) : valor;
  return moneyFormatter.format(Number.isFinite(n) ? n : 0);
};

export const formatDateBR = (iso: string): string =>
  format(parseISO(iso), 'dd/MM/yyyy', { locale: ptBR });

export const formatMonthYear = (iso: string): string =>
  format(parseISO(iso), 'MMMM/yyyy', { locale: ptBR });

export const todayISO = (): string => format(new Date(), 'yyyy-MM-dd');

export const currentMonthKey = (): string => format(new Date(), 'yyyy-MM');

export const monthBounds = (yyyyMm: string): { start: string; end: string } => {
  const ref = parseISO(`${yyyyMm}-01`);
  return {
    start: format(startOfMonth(ref), 'yyyy-MM-dd'),
    end: format(endOfMonth(ref), 'yyyy-MM-dd')
  };
};

export const parseMoneyInput = (raw: string): number => {
  const cleaned = raw.replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error('valor_invalido');
  return Math.round(n * 100) / 100;
};
