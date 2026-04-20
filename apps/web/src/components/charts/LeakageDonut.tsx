import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategorySlice } from '@/utils/aggregate';
import { formatMoney } from '@/utils/format';

interface Props {
  data: CategorySlice[];
}

export default function LeakageDonut({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
        Sem gastos neste período.
      </div>
    );
  }

  const total = data.reduce((acc, s) => acc + s.valor, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="valor"
              nameKey="categoriaNome"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              strokeWidth={0}
            >
              {data.map((s, i) => (
                <Cell key={i} fill={s.cor} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name, p) => [
                `${formatMoney(value)} (${p.payload.percent}%)`,
                p.payload.categoriaNome
              ]}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-slate-500">Total</span>
          <span className="font-semibold text-lg">{formatMoney(total)}</span>
        </div>
      </div>
      <ul className="space-y-2 max-h-64 overflow-y-auto pr-2">
        {data.map((s) => (
          <li key={s.categoriaId ?? 'none'} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: s.cor }}
              aria-hidden
            />
            <span className="flex-1 truncate">{s.categoriaNome}</span>
            <span className="font-medium">{formatMoney(s.valor)}</span>
            <span className="text-slate-400 text-xs w-12 text-right">{s.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
