import { useMessages } from './useMessages';
import { usePathname } from 'next/navigation';

export function useFields() {
  const { formatMessage, labels } = useMessages();
  const pathname = usePathname();
  const isEventsPage = pathname?.includes('/events');

  // 基本字段列表
  const baseFields = [
    // { name: 'cohort', type: 'string', label: formatMessage(labels.cohort) },
    // { name: 'segment', type: 'string', label: formatMessage(labels.segment) },
    { name: 'url', type: 'string', label: formatMessage(labels.url) },
    { name: 'title', type: 'string', label: formatMessage(labels.pageTitle) },
    { name: 'referrer', type: 'string', label: formatMessage(labels.referrer) },
    { name: 'query', type: 'string', label: formatMessage(labels.query) },
    { name: 'browser', type: 'string', label: formatMessage(labels.browser) },
    { name: 'os', type: 'string', label: formatMessage(labels.os) },
    { name: 'device', type: 'string', label: formatMessage(labels.device) },
    { name: 'country', type: 'string', label: formatMessage(labels.country) },
    { name: 'region', type: 'string', label: formatMessage(labels.region) },
    { name: 'city', type: 'string', label: formatMessage(labels.city) },
    { name: 'host', type: 'string', label: formatMessage(labels.host) },
    { name: 'tag', type: 'string', label: formatMessage(labels.tag) },
  ];

  // 只有在events页面才添加event字段
  const fields = isEventsPage
    ? [...baseFields, { name: 'event', type: 'string', label: formatMessage(labels.event) }]
    : baseFields;

  return { fields };
}

export default useFields;
