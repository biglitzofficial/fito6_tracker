import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useApiQuery<T>(
  queryKey: readonly unknown[],
  endpoint: string,
  options?: { staleTime?: number; enabled?: boolean }
) {
  return useQuery({
    queryKey,
    queryFn: () => api.get<T>(endpoint),
    staleTime: options?.staleTime ?? 60_000,
    enabled: options?.enabled ?? true,
    placeholderData: keepPreviousData,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    refetchOnMount: 'always',
  });
}

export function useCategories(type: 'INCOME' | 'EXPENSE') {
  return useApiQuery<import('@/types').Category[]>(
    queryKeys.categories(type),
    `/categories?type=${type}`,
    { staleTime: 10 * 60_000 }
  );
}

export function useAccounts(type?: import('@/types').AccountType) {
  const endpoint = type ? `/accounts?type=${type}` : '/accounts';
  return useApiQuery<import('@/types').Account[]>(
    queryKeys.accounts(type),
    endpoint,
    { staleTime: 10 * 60_000 }
  );
}

export function useParties(type?: import('@/types').PartyType) {
  const endpoint = type ? `/parties?type=${type}` : '/parties';
  return useApiQuery<import('@/types').Party[]>(
    queryKeys.parties(type),
    endpoint,
    { staleTime: 10 * 60_000 }
  );
}

export function useInvalidate() {
  const queryClient = useQueryClient();
  return (queryKey: readonly unknown[]) =>
    queryClient.invalidateQueries({ queryKey });
}

export function prefetchRoute(queryClient: ReturnType<typeof useQueryClient>, href: string) {
  const prefetch = <T,>(key: readonly unknown[], endpoint: string) =>
    queryClient.prefetchQuery({
      queryKey: key,
      queryFn: () => api.get<T>(endpoint),
      staleTime: 60_000,
    });

  switch (href) {
    case '/dashboard':
      return prefetch(queryKeys.dashboard, '/dashboard');
    case '/income':
      return prefetch(queryKeys.income(''), '/income?search=');
    case '/expenses':
      return prefetch(queryKeys.expenses(''), '/expenses?search=');
    case '/accounts':
      return prefetch(queryKeys.accounts(), '/accounts');
    case '/staff':
      return prefetch(queryKeys.staffList, '/staff?includeInactive=true');
    case '/tasks':
      return prefetch(queryKeys.tasks, '/tasks');
    case '/documents':
      return prefetch(queryKeys.documents(''), '/documents?search=');
    case '/notifications':
      return prefetch(queryKeys.notifications, '/notifications');
    case '/settings':
      return prefetch(queryKeys.settings, '/settings');
    case '/audit-logs':
      return prefetch(queryKeys.auditLogs, '/audit-logs');
    case '/ledger':
      return prefetch(queryKeys.ledger('page=1&limit=50&type=ALL'), '/ledger?page=1&limit=50&type=ALL');
    case '/profit-loss': {
      const month = new Date();
      const periodMonth = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      return prefetch(queryKeys.profitLoss(periodMonth), `/profit-loss?periodMonth=${periodMonth}`);
    }
    default:
      return undefined;
  }
}
