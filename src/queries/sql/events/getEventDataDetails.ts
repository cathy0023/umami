import prisma from '@/lib/prisma';
import clickhouse from '@/lib/clickhouse';
import { CLICKHOUSE, PRISMA, runQuery } from '@/lib/db';
import { QueryFilters } from '@/lib/types';

export interface EventDetailRow {
  selectedPropertyValue: string;
  otherProperties: Record<string, any>;
  eventCount: number;
  distinctSessions: number;
  distinctUsers: number;
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

export async function getEventDataDetails(
  websiteId: string,
  filters: QueryFilters & {
    eventName: string;
    propertyName: string;
    page?: number;
    limit?: number;
  },
): Promise<EventDetailsResponse> {
  return runQuery({
    [PRISMA]: () => relationalQuery(websiteId, filters),
    [CLICKHOUSE]: () => clickhouseQuery(websiteId, filters),
  });
}

async function relationalQuery(
  websiteId: string,
  filters: QueryFilters & {
    eventName: string;
    propertyName: string;
    page?: number;
    limit?: number;
  },
): Promise<EventDetailsResponse> {
  const { rawQuery, parseFilters } = prisma;
  const { eventName, propertyName, page = 1, limit = 25, ...queryFilters } = filters;

  const offset = (page - 1) * limit;

  // 解析筛选条件
  const { filterQuery, cohortQuery, params } = await parseFilters(websiteId, queryFilters);

  try {
    // 获取所有属性名
    const allPropsResult = await rawQuery(
      `
      SELECT DISTINCT ed.data_key
      FROM website_event we
      JOIN event_data ed ON we.event_id = ed.website_event_id
      WHERE we.website_id = {{websiteId::uuid}}
        AND we.event_name = {{eventName}}
        AND we.created_at BETWEEN {{startDate}} AND {{endDate}}
      ${cohortQuery}
      ${filterQuery}
      ORDER BY ed.data_key
      `,
      { ...params, eventName },
    );

    const allProperties = Array.isArray(allPropsResult)
      ? allPropsResult.map((row: any) => row.data_key)
      : [];

    // 数据透视查询 - 每个事件记录的属性组合分别显示
    const dataResult = await rawQuery(
      `
      WITH event_properties AS (
        SELECT 
          we.event_id,
          we.session_id,
          ed.data_key,
          CASE 
            WHEN ed.data_type = 2 THEN REPLACE(ed.string_value, '.0000', '')
            WHEN ed.data_type = 4 THEN to_char(ed.date_value, 'YYYY-MM-DD HH24:MI:SS')
            ELSE ed.string_value
          END as data_value
        FROM website_event we
        JOIN event_data ed ON ed.website_event_id = we.event_id
        WHERE we.website_id = {{websiteId::uuid}}
          AND we.event_name = {{eventName}}
          AND we.created_at BETWEEN {{startDate}} AND {{endDate}}
          AND ed.website_id = {{websiteId::uuid}}
        ${cohortQuery}
        ${filterQuery}
      ),
      -- 将每个事件的属性转为行格式
      pivoted_events AS (
        SELECT 
          event_id,
          session_id,
          json_object_agg(data_key, data_value) as all_properties
        FROM event_properties
        GROUP BY event_id, session_id
      ),
      -- 提取选中属性值和其他属性的每个独立组合
      property_combinations AS (
        SELECT 
          all_properties->>{{propertyName}} as selected_property_value,
          CASE 
            WHEN {{propertyName}} = 'org_name' THEN json_build_object(
              'click_type', all_properties->>'click_type', 
              'topic_name', all_properties->>'topic_name',
              'user_name', all_properties->>'user_name'
            )
            WHEN {{propertyName}} = 'click_type' THEN json_build_object(
              'org_name', all_properties->>'org_name',
              'topic_name', all_properties->>'topic_name',
              'user_name', all_properties->>'user_name'
            )
            WHEN {{propertyName}} = 'user_name' THEN json_build_object(
              'org_name', all_properties->>'org_name',
              'click_type', all_properties->>'click_type', 
              'topic_name', all_properties->>'topic_name'
            )
            WHEN {{propertyName}} = 'topic_name' THEN json_build_object(
              'org_name', all_properties->>'org_name',
              'click_type', all_properties->>'click_type', 
              'user_name', all_properties->>'user_name'
            )
            ELSE json_build_object(
              'org_name', all_properties->>'org_name',
              'click_type', all_properties->>'click_type', 
              'topic_name', all_properties->>'topic_name',
              'user_name', all_properties->>'user_name'
            )
          END as other_properties,
          event_id,
          session_id
        FROM pivoted_events
        WHERE all_properties->>{{propertyName}} IS NOT NULL
      )
      SELECT 
        selected_property_value,
        other_properties::text as other_properties_json,
        COUNT(*) as event_count,
        COUNT(DISTINCT session_id) as distinct_sessions,
        COUNT(DISTINCT CASE 
          WHEN other_properties->>'user_name' IS NOT NULL 
          THEN other_properties->>'user_name' 
        END) as distinct_users
      FROM property_combinations
      WHERE selected_property_value IS NOT NULL
        AND selected_property_value != ''
      GROUP BY 
        selected_property_value,
        other_properties::text
      ORDER BY event_count DESC, selected_property_value
      LIMIT {{limit}} OFFSET {{offset}}
      `,
      { ...params, eventName, propertyName, limit, offset },
    );

    // 获取总数
    const countResult = await rawQuery(
      `
      WITH event_properties AS (
        SELECT 
          we.event_id,
          we.session_id,
          ed.data_key,
          CASE 
            WHEN ed.data_type = 2 THEN REPLACE(ed.string_value, '.0000', '')
            WHEN ed.data_type = 4 THEN to_char(ed.date_value, 'YYYY-MM-DD HH24:MI:SS')
            ELSE ed.string_value
          END as data_value
        FROM website_event we
        JOIN event_data ed ON ed.website_event_id = we.event_id
        WHERE we.website_id = {{websiteId::uuid}}
          AND we.event_name = {{eventName}}
          AND we.created_at BETWEEN {{startDate}} AND {{endDate}}
          AND ed.website_id = {{websiteId::uuid}}
        ${cohortQuery}
        ${filterQuery}
      ),
      pivoted_events AS (
        SELECT 
          event_id,
          session_id,
          json_object_agg(data_key, data_value) as all_properties
        FROM event_properties
        GROUP BY event_id, session_id
      ),
      property_combinations AS (
        SELECT 
          all_properties->>{{propertyName}} as selected_property_value,
          CASE 
            WHEN {{propertyName}} = 'org_name' THEN json_build_object(
              'click_type', all_properties->>'click_type', 
              'topic_name', all_properties->>'topic_name',
              'user_name', all_properties->>'user_name'
            )
            WHEN {{propertyName}} = 'click_type' THEN json_build_object(
              'org_name', all_properties->>'org_name',
              'topic_name', all_properties->>'topic_name',
              'user_name', all_properties->>'user_name'
            )
            WHEN {{propertyName}} = 'user_name' THEN json_build_object(
              'org_name', all_properties->>'org_name',
              'click_type', all_properties->>'click_type', 
              'topic_name', all_properties->>'topic_name'
            )
            WHEN {{propertyName}} = 'topic_name' THEN json_build_object(
              'org_name', all_properties->>'org_name',
              'click_type', all_properties->>'click_type', 
              'user_name', all_properties->>'user_name'
            )
            ELSE json_build_object(
              'org_name', all_properties->>'org_name',
              'click_type', all_properties->>'click_type', 
              'topic_name', all_properties->>'topic_name',
              'user_name', all_properties->>'user_name'
            )
          END as other_properties
        FROM pivoted_events
        WHERE all_properties->>{{propertyName}} IS NOT NULL
          AND all_properties->>{{propertyName}} != ''
      )
      SELECT COUNT(DISTINCT (
        selected_property_value,
        other_properties::text
      )) as total
      FROM property_combinations
      `,
      { ...params, eventName, propertyName },
    );

    const total = parseInt(countResult[0]?.total || '0');

    const data: EventDetailRow[] = Array.isArray(dataResult)
      ? dataResult.map((row: any) => ({
          selectedPropertyValue: row.selected_property_value || '',
          otherProperties: row.other_properties_json ? JSON.parse(row.other_properties_json) : {},
          eventCount: parseInt(row.event_count),
          distinctSessions: parseInt(row.distinct_sessions),
          distinctUsers: parseInt(row.distinct_users),
        }))
      : [];

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      selectedProperty: propertyName,
      allProperties,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in relationalQuery:', error);
    throw error;
  }
}

async function clickhouseQuery(
  websiteId: string,
  filters: QueryFilters & {
    eventName: string;
    propertyName: string;
    page?: number;
    limit?: number;
  },
): Promise<EventDetailsResponse> {
  const { rawQuery, parseFilters } = clickhouse;
  const { eventName, propertyName, page = 1, limit = 25, ...queryFilters } = filters;

  const offset = (page - 1) * limit;

  // 解析筛选条件
  const { filterQuery, params } = await parseFilters(websiteId, queryFilters);

  try {
    // 获取所有属性名
    const allPropsResult = await rawQuery(
      `
      SELECT DISTINCT data_key
      FROM event_data
      WHERE website_id = {websiteId:UUID}
        AND event_name = {eventName:String}
        AND created_at BETWEEN {startDate:DateTime64} AND {endDate:DateTime64}
        ${filterQuery}
      ORDER BY data_key
      `,
      { ...params, eventName },
    );

    const allProperties = Array.isArray(allPropsResult)
      ? allPropsResult.map((row: any) => row.data_key)
      : [];

    // ClickHouse数据查询
    const dataResult = await rawQuery(
      `
      WITH session_properties AS (
        SELECT 
          session_id,
          data_key,
          multiIf(
            data_type = 2, replaceAll(string_value, '.0000', ''),
            data_type = 4, toString(date_value),
            string_value
          ) as data_value
        FROM event_data
        WHERE website_id = {websiteId:UUID}
          AND event_name = {eventName:String}
          AND created_at BETWEEN {startDate:DateTime64} AND {endDate:DateTime64}
          ${filterQuery}
      ),
      pivoted_sessions AS (
        SELECT 
          session_id,
          groupArrayMap((k, v) -> (k, v), data_key, data_value) as properties_array
        FROM session_properties
        GROUP BY session_id
      )
      SELECT 
        arrayElement(arrayFilter(x -> tupleElement(x, 1) = {propertyName:String}, properties_array)[1], 2) as selected_property_value,
        arrayFilter(x -> tupleElement(x, 1) != {propertyName:String}, properties_array) as other_properties,
        count() as event_count,
        uniq(session_id) as distinct_sessions,
        uniqIf(
          arrayElement(arrayFilter(x -> tupleElement(x, 1) = 'user_name', properties_array)[1], 2),
          arrayExists(x -> tupleElement(x, 1) = 'user_name', properties_array)
        ) as distinct_users
      FROM pivoted_sessions
      WHERE arrayExists(x -> tupleElement(x, 1) = {propertyName:String}, properties_array)
      GROUP BY 
        selected_property_value,
        other_properties
      ORDER BY event_count DESC
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
      `,
      { ...params, eventName, propertyName, limit, offset },
    );

    // 获取总数
    const countResult = await rawQuery(
      `
      WITH session_properties AS (
        SELECT 
          session_id,
          data_key,
          multiIf(
            data_type = 2, replaceAll(string_value, '.0000', ''),
            data_type = 4, toString(date_value),
            string_value
          ) as data_value
        FROM event_data
        WHERE website_id = {websiteId:UUID}
          AND event_name = {eventName:String}
          AND created_at BETWEEN {startDate:DateTime64} AND {endDate:DateTime64}
          ${filterQuery}
      ),
      pivoted_sessions AS (
        SELECT 
          session_id,
          groupArrayMap((k, v) -> (k, v), data_key, data_value) as properties_array
        FROM session_properties
        GROUP BY session_id
      )
      SELECT uniq((
        arrayElement(arrayFilter(x -> tupleElement(x, 1) = {propertyName:String}, properties_array)[1], 2),
        arrayFilter(x -> tupleElement(x, 1) != {propertyName:String}, properties_array)
      )) as total
      FROM pivoted_sessions
      WHERE arrayExists(x -> tupleElement(x, 1) = {propertyName:String}, properties_array)
      `,
      { ...params, eventName, propertyName },
    );

    const total = parseInt(countResult[0]?.total || '0');

    const data: EventDetailRow[] = Array.isArray(dataResult)
      ? dataResult.map((row: any) => {
          // 将ClickHouse的array格式转换为对象
          const otherProps: Record<string, any> = {};
          if (Array.isArray(row.other_properties)) {
            row.other_properties.forEach(([key, value]: [string, any]) => {
              otherProps[key] = value;
            });
          }

          return {
            selectedPropertyValue: row.selected_property_value || '',
            otherProperties: otherProps,
            eventCount: parseInt(row.event_count),
            distinctSessions: parseInt(row.distinct_sessions),
            distinctUsers: parseInt(row.distinct_users),
          };
        })
      : [];

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      selectedProperty: propertyName,
      allProperties,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in clickhouseQuery:', error);
    throw error;
  }
}
