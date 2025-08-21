import prisma from '@/lib/prisma';
import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import { QueryFilters, WebsiteEventData } from '@/lib/types';

export async function getEventDataValues(
  ...args: [
    websiteId: string,
    filters: QueryFilters & { eventName?: string; propertyName?: string; valueFilter?: string },
  ]
): Promise<WebsiteEventData[]> {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  });
}

async function relationalQuery(
  websiteId: string,
  filters: QueryFilters & { eventName?: string; propertyName?: string; valueFilter?: string },
) {
  const { rawQuery, parseFilters, getDateSQL } = prisma;
  const { valueFilter, ...otherFilters } = filters;

  const { filterQuery, cohortQuery, params } = await parseFilters(websiteId, otherFilters);

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
      case 
        when data_type = 2 then replace(string_value, '.0000', '') 
        when data_type = 4 then ${getDateSQL('date_value', 'hour')} 
        else string_value
      end as "value",
      count(*) as "total"
    from event_data
    join website_event on website_event.event_id = event_data.website_event_id
      and website_event.website_id = {{websiteId::uuid}}
      and website_event.created_at between {{startDate}} and {{endDate}}
    ${cohortQuery}
    where event_data.website_id = {{websiteId::uuid}}
      and event_data.created_at between {{startDate}} and {{endDate}}
      and event_data.data_key = {{propertyName}}
      and website_event.event_name = {{eventName}}
    ${filterQuery}
    ${valueFilterQuery}
    group by value
    order by 2 desc
    limit 100
    `,
    queryParams,
  );
}

async function clickhouseQuery(
  websiteId: string,
  filters: QueryFilters & { eventName?: string; propertyName?: string; valueFilter?: string },
): Promise<{ value: string; total: number }[]> {
  const { rawQuery, parseFilters } = clickhouse;
  const { valueFilter, ...otherFilters } = filters;

  const { filterQuery, cohortQuery, params } = await parseFilters(websiteId, otherFilters);

  // 构建 valueFilter 条件 - 基于website_event表的tag字段筛选
  const valueFilterQuery = valueFilter
    ? `and we.tag != '' and positionCaseInsensitive(we.tag, {valueFilter:String}) > 0`
    : '';

  // 添加 valueFilter 参数
  const queryParams = {
    ...params,
    ...(valueFilter && { valueFilter }),
  };

  // 根据是否有valueFilter选择不同的查询策略
  if (valueFilter) {
    return rawQuery(
      `
      select
        multiIf(ed.data_type = 2, replaceAll(ed.string_value, '.0000', ''),
                ed.data_type = 4, toString(date_trunc('hour', ed.date_value)),
                ed.string_value) as "value",
        count(*) as "total"
      from event_data ed
      inner join website_event we on we.event_id = ed.event_id
      ${cohortQuery}
      where ed.website_id = {websiteId:UUID}
        and ed.created_at between {startDate:DateTime64} and {endDate:DateTime64}
        and ed.data_key = {propertyName:String}
        and ed.event_name = {eventName:String}
        and we.website_id = {websiteId:UUID}
        and we.created_at between {startDate:DateTime64} and {endDate:DateTime64}
        and we.event_name = {eventName:String}
      ${filterQuery}
      ${valueFilterQuery}
      group by value
      order by 2 desc
      limit 100
      `,
      queryParams,
    );
  } else {
    return rawQuery(
      `
      select
        multiIf(data_type = 2, replaceAll(string_value, '.0000', ''),
                data_type = 4, toString(date_trunc('hour', date_value)),
                string_value) as "value",
        count(*) as "total"
      from event_data
      ${cohortQuery}
      where website_id = {websiteId:UUID}
        and created_at between {startDate:DateTime64} and {endDate:DateTime64}
        and data_key = {propertyName:String}
        and event_name = {eventName:String}
      ${filterQuery}
      group by value
      order by 2 desc
      limit 100
      `,
      params,
    );
  }
}
