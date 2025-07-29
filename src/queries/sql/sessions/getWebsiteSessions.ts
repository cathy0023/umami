import clickhouse from '@/lib/clickhouse';
import { EVENT_COLUMNS } from '@/lib/constants';
import { CLICKHOUSE, getDatabaseType, POSTGRESQL, PRISMA, runQuery } from '@/lib/db';
import prisma from '@/lib/prisma';
import { PageParams, QueryFilters } from '@/lib/types';

export async function getWebsiteSessions(
  ...args: [websiteId: string, filters?: QueryFilters, pageParams?: PageParams]
) {
  return runQuery({
    [PRISMA]: () => relationalQuery(...args),
    [CLICKHOUSE]: () => clickhouseQuery(...args),
  });
}

async function relationalQuery(websiteId: string, filters: QueryFilters, pageParams: PageParams) {
  const { pagedRawQuery, parseFilters } = prisma;
  const { search } = pageParams;
  const { filterQuery, cohortQuery, params } = await parseFilters(websiteId, {
    ...filters,
  });

  const db = getDatabaseType();
  const like = db === POSTGRESQL ? 'ilike' : 'like';

  return pagedRawQuery(
    `
    select
      session.session_id as "id",
      session.website_id as "websiteId",
      session.distinct_id as "distinctId",
      website_event.hostname,
      session.browser,
      session.os,
      session.device,
      session.screen,
      session.language,
      session.country,
      session.region,
      session.city,
      user_name.string_value as "user_name",
      org_name.string_value as "org_name",
      min(website_event.created_at) as "firstAt",
      max(website_event.created_at) as "lastAt",
      count(distinct website_event.visit_id) as "visits",
      sum(case when website_event.event_type = 1 then 1 else 0 end) as "views",
      max(website_event.created_at) as "createdAt"
    from website_event 
    ${cohortQuery}
    join session on session.session_id = website_event.session_id
    left join session_data as user_name on user_name.session_id = session.session_id and user_name.data_key = 'name'
    left join session_data as org_name on org_name.session_id = session.session_id and org_name.data_key = 'org_name'
    where website_event.website_id = {{websiteId::uuid}}
        and website_event.created_at between {{startDate}} and {{endDate}}
    ${filterQuery}
    ${
      search
        ? `and (COALESCE(session.distinct_id, '') ${like} {{search}}
           or COALESCE(city, '') ${like} {{search}}
           or COALESCE(browser, '') ${like} {{search}}
           or COALESCE(os, '') ${like} {{search}}
           or COALESCE(device, '') ${like} {{search}}
           or COALESCE(user_name.string_value, '') ${like} {{search}}
           or COALESCE(org_name.string_value, '') ${like} {{search}})`
        : ''
    }
    group by session.session_id, 
      session.website_id, 
      session.distinct_id,
      website_event.hostname, 
      session.browser, 
      session.os, 
      session.device, 
      session.screen, 
      session.language, 
      session.country, 
      session.region, 
      session.city,
      user_name.string_value,
      org_name.string_value
    order by max(website_event.created_at) desc
    `,
    { ...params, search: `%${search}%` },
    pageParams,
  );
}

async function clickhouseQuery(websiteId: string, filters: QueryFilters, pageParams?: PageParams) {
  const { pagedQuery, parseFilters, getDateStringSQL } = clickhouse;
  const { params, dateQuery, filterQuery, cohortQuery } = await parseFilters(websiteId, filters);
  const { search } = pageParams;

  let sql = '';

  if (EVENT_COLUMNS.some(item => Object.keys(filters).includes(item))) {
    sql = `
    select
      session_id as id,
      website_id as websiteId,
      browser,
      os,
      device,
      screen,
      language,
      country,
      region,
      city,
      ${getDateStringSQL('min(created_at)')} as firstAt,
      ${getDateStringSQL('max(created_at)')} as lastAt,
      uniq(visit_id) as visits,
      sumIf(views, event_type = 1) as views,
      lastAt as createdAt
    from website_event
    ${cohortQuery}
    where website_id = {websiteId:UUID}
    ${dateQuery}
    ${filterQuery}
    ${
      search
        ? `and ((positionCaseInsensitive(distinct_id, {search:String}) > 0)
           or (positionCaseInsensitive(city, {search:String}) > 0)
           or (positionCaseInsensitive(browser, {search:String}) > 0)
           or (positionCaseInsensitive(os, {search:String}) > 0)
           or (positionCaseInsensitive(device, {search:String}) > 0))`
        : ''
    }
    group by session_id, website_id, browser, os, device, screen, language, country, region, city
    order by lastAt desc
    `;
  } else {
    sql = `
    select
      s.session_id as id,
      s.website_id as websiteId,
      s.distinct_id as distinctId,
      s.hostname,
      s.browser,
      s.os,
      s.device,
      s.screen,
      s.language,
      s.country,
      s.region,
      s.city,
      user_name.string_value as user_name,
      org_name.string_value as org_name,
      ${getDateStringSQL('min(s.min_time)')} as firstAt,
      ${getDateStringSQL('max(s.max_time)')} as lastAt,
      uniq(s.visit_id) as visits,
      sumIf(s.views, s.event_type = 1) as views,
      lastAt as createdAt
    from website_event_stats_hourly as s
    left join (
      select session_id, string_value
      from session_data
      where website_id = {websiteId:UUID} and data_key = 'name'
    ) as user_name on user_name.session_id = s.session_id
    left join (
      select session_id, string_value
      from session_data
      where website_id = {websiteId:UUID} and data_key = 'org_name'
    ) as org_name on org_name.session_id = s.session_id
    where s.website_id = {websiteId:UUID}
    ${dateQuery}
    ${filterQuery}
    ${
      search
        ? `and ((positionCaseInsensitive(ifNull(s.distinct_id, ''), {search:String}) > 0)
           or (positionCaseInsensitive(ifNull(s.city, ''), {search:String}) > 0)
           or (positionCaseInsensitive(ifNull(s.browser, ''), {search:String}) > 0)
           or (positionCaseInsensitive(ifNull(s.os, ''), {search:String}) > 0)
           or (positionCaseInsensitive(ifNull(s.device, ''), {search:String}) > 0)
           or (positionCaseInsensitive(ifNull(user_name.string_value, ''), {search:String}) > 0)
           or (positionCaseInsensitive(ifNull(org_name.string_value, ''), {search:String}) > 0))`
        : ''
    }
    group by s.session_id, s.website_id, s.distinct_id, s.hostname, s.browser, s.os, s.device, s.screen, s.language, s.country, s.region, s.city, user_name.string_value, org_name.string_value
    order by lastAt desc
    `;
  }

  return pagedQuery(sql, { ...params, search }, pageParams);
}
