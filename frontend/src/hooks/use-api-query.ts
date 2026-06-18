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
  });
}

export function useCategories(type: 'INCOME' | 'EXPENSE') {
  return useApiQuery<import('@/types').Category[]>(
    queryKeys.categories(type),
    `/categories?type=${type}`,
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
    default:
      return undefined;
  }
}
