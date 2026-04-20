import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
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
