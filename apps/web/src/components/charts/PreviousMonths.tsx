import type { HistoryRow } from '@/utils/aggregate';
import { formatMoney } from '@/utils/format';

const MONTH_ABBREV = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez'
] as const;

function label(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return `${MONTH_ABBREV[m - 1]}/${y}`;
}

interface Props {
  rows: HistoryRow[];
  onSelect?: (month: string) => void;
}

export default function PreviousMonths({ rows, onSelect }: Props) {
  const reversed = [...rows].reverse();
  if (reversed.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs uppercase text-slate-500 border-b border-slate-200">
            <th className="text-left p-3 font-semibold">Mês/Ano</th>
            <th className="text-right p-3 font-semibold">Entradas</th>
            <th className="text-right p-3 font-semibold">Saídas</th>
            <th className="text-right p-3 font-semibold">Resultado</th>
            <th className="text-right p-3 font-semibold">Caixa</th>
          </tr>
        </thead>
        <tbody>
          {reversed.map((r) => (
            <tr
              key={r.month}
              onClick={() => onSelect?.(r.month)}
              className={`border-b border-slate-100 last:border-b-0 ${
                onSelect ? 'cursor-pointer hover:bg-slate-50' : ''
              }`}
            >
              <td className="p-3 font-medium capitalize">{label(r.month)}</td>
              <td className="p-3 text-right text-emerald-600">{formatMoney(r.entradas)}</td>
              <td className="p-3 text-right text-red-600">{formatMoney(r.saidas)}</td>
              <td
                className={`p-3 text-right font-semibold ${
                  r.resultado >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {formatMoney(r.resultado)}
              </td>
              <td
                className={`p-3 text-right ${
                  r.caixaAcumulado >= 0 ? 'text-slate-900' : 'text-red-600'
                }`}
              >
                {formatMoney(r.caixaAcumulado)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
