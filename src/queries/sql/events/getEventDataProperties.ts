import prisma from '@/lib/prisma';
import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import { QueryFilters, WebsiteEventData } from '@/lib/types';

export async function getEventDataProperties(
  ...args: [
    websiteId: string,
    filters: QueryFilters & { propertyName?: string; valueFilter?: string },
  ]
): Promise<WebsiteEventData[]> {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  });
}

async function relationalQuery(
  websiteId: string,
  filters: QueryFilters & { propertyName?: string; valueFilter?: string },
) {
  const { rawQuery, parseFilters } = prisma;
  const { valueFilter, ...otherFilters } = filters;

  const { filterQuery, cohortQuery, params } = await parseFilters(websiteId, otherFilters, {
    columns: { propertyName: 'data_key' },
  });

  // 构建 valueFilter 条件 - 基于website_event表的tag字段筛选
  const valueFilterQuery = valueFilter ? `and website_event.tag ilike {{valueFilter}}` : '';

  // 添加 valueFilter 参数
  const queryParams = {
    ...params,
    ...(valueFilter && { valueFilter: `%${valueFilter}%` }),
  };

  return rawQuery(
    `
    select
      website_event.event_name as "eventName",
      event_data.data_key as "propertyName",
      count(*) as "total"
    from event_data 
    join website_event on website_event.event_id = event_data.website_event_id
      and website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
    ${cohortQuery}
    where event_data.website_id = {{websiteId::uuid}}
      and event_data.created_at between {{startDate}} and {{endDate}}
    ${filterQuery}
    ${valueFilterQuery}
    group by website_event.event_name, event_data.data_key
    order by 3 desc
    limit 500
    `,
    queryParams,
  );
}

async function clickhouseQuery(
  websiteId: string,
  filters: QueryFilters & { propertyName?: string; valueFilter?: string },
): Promise<{ eventName: string; propertyName: string; total: number }[]> {
  const { rawQuery, parseFilters } = clickhouse;
  const { valueFilter, ...otherFilters } = filters;

  const { filterQuery, cohortQuery, params } = await parseFilters(websiteId, otherFilters, {
    columns: { propertyName: 'data_key' },
  });

  // 构建 valueFilter 条件 - 基于website_event表的tag字段筛选
  const valueFilterQuery = valueFilter
    ? `and we.tag != '' and positionCaseInsensitive(we.tag, {valueFilter:String}) > 0`
    : '';

  // 添加 valueFilter 参数
  const queryParams = {
    ...params,
    ...(valueFilter && { valueFilter }),
  };

  // 如果有valueFilter，需要JOIN website_event来获取tag字段
  if (valueFilter) {
    return rawQuery(
      `
      select
        we.event_name as eventName,
        ed.data_key as propertyName,
        count(*) as total
      from event_data ed
      inner join website_event we on we.event_id = ed.event_id
      ${cohortQuery}
      where ed.website_id = {websiteId:UUID}
        and ed.created_at between {startDate:DateTime64} and {endDate:DateTime64}
        and we.website_id = {websiteId:UUID}
        and we.created_at between {startDate:DateTime64} and {endDate:DateTime64}
      ${filterQuery}
      ${valueFilterQuery}
      group by we.event_name, ed.data_key
      order by 3 desc
      limit 500
      `,
      queryParams,
    );
  } else {
    // 没有valueFilter时，直接查询event_data表，性能更好
    return rawQuery(
      `
      select
        event_name as eventName,
        data_key as propertyName,
        count(*) as total
      from event_data
      ${cohortQuery}
      where website_id = {websiteId:UUID}
        and created_at between {startDate:DateTime64} and {endDate:DateTime64}
      ${filterQuery}
      group by event_name, data_key
      order by 3 desc
      limit 500
      `,
      params,
    );
  }
}
