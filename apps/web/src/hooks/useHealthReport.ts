import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { analyzeHealth, fetchHealthReport, type HealthReport } from '@/lib/api';

export type { HealthReport };

export function useHealthReport(workspaceId: string | undefined, mes: string) {
  return useQuery({
    queryKey: ['health', workspaceId, mes],
    enabled: !!workspaceId,
    retry: false,
    queryFn: () => fetchHealthReport(workspaceId!, mes)
  });
}

export function useAnalyzeHealth(workspaceId: string | undefined, mes: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => analyzeHealth(workspaceId!, mes),
    onSuccess: (data) => qc.setQueryData(['health', workspaceId, mes], data)
  });
}
