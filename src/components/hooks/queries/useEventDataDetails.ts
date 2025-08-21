import { useApi } from '../useApi';
import { useFilterParams } from '../useFilterParams';
import { UseQueryOptions } from '@tanstack/react-query';

export interface EventDetailRow {
  selectedPropertyValue: string; // 选中属性的值
  otherProperties: Record<string, any>; // 其他属性值组合
  eventCount: number; // 该属性值组合的触发次数
  distinctSessions: number; // 涉及的会话数
  distinctUsers: number; // 涉及的用户数
}

export interface EventDetailsResponse {
  data: EventDetailRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  selectedProperty: string;
  allProperties: string[];
}

export interface UseEventDataDetailsOptions
  extends Omit<UseQueryOptions<EventDetailsResponse>, 'queryKey' | 'queryFn'> {
  page?: number;
  limit?: number;
  companyFilter?: string;
}

export function useEventDataDetails(
  websiteId: string,
  eventName: string,
  propertyName: string,
  options: UseEventDataDetailsOptions = {},
) {
  const { get, useQuery } = useApi();
  const params = useFilterParams(websiteId);
  const { page = 1, limit = 25, companyFilter, ...queryOptions } = options;

  // 构建包含公司筛选的参数
  const queryParams = {
    ...params,
    eventName,
    propertyName,
    page: page.toString(),
    limit: limit.toString(),
    ...(companyFilter && companyFilter.trim() && { valueFilter: companyFilter.trim() }),
  };

  return useQuery<EventDetailsResponse>({
    queryKey: [
      'websites:event-data:details',
      {
        websiteId,
        eventName,
        propertyName,
        page,
        limit,
        companyFilter,
        ...params,
      },
    ],
    queryFn: () => get(`/websites/${websiteId}/event-data/details`, queryParams),
    enabled: !!(websiteId && eventName && propertyName),
    ...queryOptions,
  });
}
