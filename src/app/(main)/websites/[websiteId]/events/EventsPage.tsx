'use client';
import WebsiteHeader from '../WebsiteHeader';
import EventsDataTable from './EventsDataTable';
import EventsMetricsBar from './EventsMetricsBar';
import EventsChart from '@/components/metrics/EventsChart';
import { GridRow } from '@/components/layout/Grid';
import EventsTable from '@/components/metrics/EventsTable';
import { useMessages, useNavigation } from '@/components/hooks';
import { Item, Tabs } from 'react-basics';
import { useState } from 'react';
import EventProperties from './EventProperties';
import FilterTags from '@/components/metrics/FilterTags';
import WebsiteFilterButton from '../WebsiteFilterButton';
import { FILTER_COLUMNS } from '@/lib/constants';

export default function EventsPage({ websiteId }) {
  const [label, setLabel] = useState(null);
  const [tab, setTab] = useState('activity');
  const [propertyName, setPropertyName] = useState('');
  const { formatMessage, labels } = useMessages();
  const { query } = useNavigation();

  // 获取筛选参数
  const params = Object.keys(query).reduce((obj, key) => {
    if (FILTER_COLUMNS[key]) {
      obj[key] = query[key];
    }
    return obj;
  }, {});

  const handleLabelClick = (value: string) => {
    setLabel(value !== label ? value : '');
  };

  const handlePropertyChange = (newPropertyName: string) => {
    /* eslint-disable no-console */
    console.log('propertyName', propertyName);
    setPropertyName(newPropertyName);
  };

  // 添加onSelect函数
  const onSelect = (value: any) => {
    setTab(value);
  };

  return (
    <>
      <WebsiteHeader websiteId={websiteId} />
      {
        <>
          {Object.keys(params).filter(key => params[key]).length > 0 ? (
            <FilterTags websiteId={websiteId} params={params} />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--base75)',
                padding: '10px 20px',
                border: '1px solid var(--base400)',
                borderRadius: '8px',
                marginBottom: '20px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ fontWeight: 700 }}>{formatMessage(labels.filters)}</div>
              <WebsiteFilterButton websiteId={websiteId} alignment="center" showText={true} />
            </div>
          )}
        </>
      }
      <EventsMetricsBar websiteId={websiteId} />
      <GridRow columns="two-one">
        <EventsChart websiteId={websiteId} focusLabel={label} />
        <EventsTable
          websiteId={websiteId}
          type="event"
          title={formatMessage(labels.events)}
          metric={formatMessage(labels.actions)}
          onLabelClick={handleLabelClick}
        />
      </GridRow>
      <div>
        <Tabs selectedKey={tab} onSelect={onSelect} style={{ marginBottom: 30 }}>
          <Item key="activity">{formatMessage(labels.activity)}</Item>
          <Item key="properties">{formatMessage(labels.properties)}</Item>
        </Tabs>
        {tab === 'activity' && <EventsDataTable websiteId={websiteId} />}
        {tab === 'properties' && (
          <EventProperties websiteId={websiteId} onPropertyChange={handlePropertyChange} />
        )}
      </div>
    </>
  );
}
