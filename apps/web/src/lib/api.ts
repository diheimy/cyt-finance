import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

type FetchInit = Parameters<typeof fetch>[1];

async function authorizedFetch(path: string, init: FetchInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('not_authenticated');
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`api_error_${res.status}: ${text}`);
  }
  return res;
}

export interface PdfReportPayload {
  workspace_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  incluir_auditoria?: boolean;
}

export interface HealthReport {
  score: number;
  nivel: 'saudavel' | 'atencao' | 'critico';
  positivos: string[];
  atencao: string[];
  recomendacoes: string[];
}

export async function fetchHealthReport(
  workspaceId: string,
  mes: string
): Promise<HealthReport | null> {
  const res = await authorizedFetch(`/health-analysis/${workspaceId}?mes=${mes}`);
  return (await res.json()) as HealthReport | null;
}

export async function analyzeHealth(workspaceId: string, mes: string): Promise<HealthReport> {
  const res = await authorizedFetch(`/health-analysis/${workspaceId}`, {
    method: 'POST',
    body: JSON.stringify({ workspace_id: workspaceId, mes })
  });
  return (await res.json()) as HealthReport;
}

export async function downloadPdfReport(payload: PdfReportPayload): Promise<void> {
  const res = await authorizedFetch('/reports/pdf', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cyt-finance-${payload.periodo_inicio}-${payload.periodo_fim}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
