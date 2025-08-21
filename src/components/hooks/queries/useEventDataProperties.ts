import { UseQueryOptions } from '@tanstack/react-query';
import { useApi } from '../useApi';
import { useFilterParams } from '../useFilterParams';

export function useEventDataProperties(
  websiteId: string,
  companyFilter?: string,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>,
) {
  const { get, useQuery } = useApi();
  const params = useFilterParams(websiteId);

  // 构建包含公司筛选的参数
  const queryParams = {
    ...params,
    ...(companyFilter && companyFilter.trim() && { valueFilter: companyFilter.trim() }),
  };

  return useQuery<any>({
    queryKey: ['websites:event-data:properties', { websiteId, companyFilter, ...params }],
    queryFn: () => get(`/websites/${websiteId}/event-data/properties`, queryParams),
    enabled: !!websiteId,
    ...options,
  });
}

export default useEventDataProperties;
