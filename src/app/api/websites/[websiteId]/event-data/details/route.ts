import { z } from 'zod';
import { parseRequest, getRequestFilters } from '@/lib/request';
import { unauthorized, json } from '@/lib/response';
import { canViewWebsite } from '@/lib/auth';
import { getEventDataDetails } from '@/queries';
import { filterParams } from '@/lib/schema';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ websiteId: string }> },
) {
  const schema = z.object({
    startAt: z.coerce.number().int(),
    endAt: z.coerce.number().int(),
    eventName: z.string(),
    propertyName: z.string(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    valueFilter: z.string().optional(),
    ...filterParams,
  });

  const { auth, query, error } = await parseRequest(request, schema);

  if (error) {
    return error();
  }

  const { websiteId } = await params;
  const { startAt, endAt, eventName, propertyName, page, limit, valueFilter } = query;

  if (!(await canViewWebsite(auth, websiteId))) {
    return unauthorized();
  }

  try {
    const requestFilters = getRequestFilters(query);

    const result = await getEventDataDetails(websiteId, {
      startDate: new Date(startAt),
      endDate: new Date(endAt),
      eventName,
      propertyName,
      page,
      limit,
      valueFilter,
      ...requestFilters,
    });

    return json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Event data details API error:', error);
    return json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    });
  }
}
