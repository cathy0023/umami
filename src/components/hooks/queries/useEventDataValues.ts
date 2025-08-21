import { UseQueryOptions } from '@tanstack/react-query';
import { useApi } from '../useApi';
import { useFilterParams } from '../useFilterParams';

export function useEventDataValues(
  websiteId: string,
  eventName: string,
  propertyName: string,
  companyFilter?: string,
  options?: Omit<UseQueryOptions, 'queryKey' | 'queryFn'>,
) {
  const { get, useQuery } = useApi();
  const params = useFilterParams(websiteId);

  // 构建包含公司筛选的参数
  const queryParams = {
    ...params,
    eventName,
    propertyName,
    ...(companyFilter && companyFilter.trim() && { valueFilter: companyFilter.trim() }),
  };

  return useQuery<any>({
    queryKey: [
      'websites:event-data:values',
      { websiteId, eventName, propertyName, companyFilter, ...params },
    ],
    queryFn: () => get(`/websites/${websiteId}/event-data/values`, queryParams),
    enabled: !!(websiteId && propertyName),
    ...options,
  });
}

export default useEventDataValues;
