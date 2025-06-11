import { GridColumn, GridTable } from 'react-basics';
import { useEventDataProperties, useEventDataValues, useMessages } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import Chart from '@/components/charts/Chart';
import { useState } from 'react';
import { CHART_COLORS } from '@/lib/constants';
import { formatLongNumber } from '@/lib/format';

import { useTheme } from '@/components/hooks';
import styles from './EventProperties.module.css';

export function EventProperties({ websiteId }: { websiteId: string }) {
  const [propertyName, setPropertyName] = useState('');
  const [eventName, setEventName] = useState('');
  const [tooltip, setTooltip] = useState(null);
  const { formatMessage, labels } = useMessages();
  const { colors } = useTheme();
  const { data, isLoading, isFetched, error } = useEventDataProperties(websiteId);
  const { data: values } = useEventDataValues(websiteId, eventName, propertyName);

  const chartData =
    propertyName && values
      ? {
          datasets: [
            {
              label: propertyName,
              data: values.map(({ value, total }) => ({
                x: value,
                y: total,
              })),
              backgroundColor: CHART_COLORS[0],
              borderColor: CHART_COLORS[0],
              borderWidth: 1,
            },
          ],
        }
      : null;

  const chartOptions = {
    plugins: {
      legend: {
        display: false, // 隐藏图例
      },
    },
    scales: {
      x: {
        type: 'category' as const,
        grid: {
          display: false,
        },
        border: {
          color: colors.chart.line,
        },
        ticks: {
          color: colors.chart.text,
          autoSkip: false,
          maxRotation: 45,
        },
      },
      y: {
        type: 'linear' as const,
        min: 0,
        beginAtZero: true,
        grid: {
          color: colors.chart.line,
        },
        border: {
          color: colors.chart.line,
        },
        ticks: {
          color: colors.chart.text,
          stepSize: 1,
          callback: function (value: any) {
            return Number.isInteger(value) ? formatLongNumber(value) : '';
          },
        },
      },
    },
    animation: {
      onComplete: function (this: any) {
        const ctx = this.ctx;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';

        this.data.datasets.forEach((dataset: any, datasetIndex: number) => {
          const meta = this.getDatasetMeta(datasetIndex);
          if (!meta.hidden) {
            meta.data.forEach((bar: any, index: number) => {
              const value = dataset.data[index].y;
              if (value > 0) {
                const x = bar.x;
                const y = bar.y + bar.height / 2;
                ctx.fillText(value.toString(), x, y);
              }
            });
          }
        });
        ctx.restore();
      },
    },
  };

  const handleRowClick = row => {
    setEventName(row.eventName);
    setPropertyName(row.propertyName);
  };

  const handleTooltip = ({ tooltip: chartTooltip }) => {
    const { opacity, dataPoints } = chartTooltip;

    setTooltip(
      opacity && dataPoints?.length > 0 ? (
        <div style={{ padding: '8px', backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: '4px' }}>
          <div style={{ color: 'white', marginBottom: '4px' }}>
            {propertyName}: {dataPoints[0].raw.x}
          </div>
          <div style={{ color: 'white' }}>count: {formatLongNumber(dataPoints[0].raw.y)}</div>
        </div>
      ) : null,
    );
  };

  return (
    <LoadingPanel isLoading={isLoading} isFetched={isFetched} data={data} error={error}>
      <div className={styles.container}>
        <GridTable data={data} cardMode={false} className={styles.table}>
          <GridColumn name="eventName" label={formatMessage(labels.name)}>
            {row => (
              <div className={styles.link} onClick={() => handleRowClick(row)}>
                {row.eventName}
              </div>
            )}
          </GridColumn>
          <GridColumn name="propertyName" label={formatMessage(labels.property)}>
            {row => (
              <div className={styles.link} onClick={() => handleRowClick(row)}>
                {row.propertyName}
              </div>
            )}
          </GridColumn>
          <GridColumn name="total" label={formatMessage(labels.count)} alignment="end" />
        </GridTable>
        {propertyName && (
          <div className={styles.chart}>
            <div className={styles.title}>
              {eventName} （{propertyName}）
            </div>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <Chart
                  key={propertyName + eventName}
                  type="bar"
                  data={chartData}
                  tooltip={tooltip}
                  onTooltip={handleTooltip}
                  chartOptions={chartOptions}
                />
              </div>
              <div
                style={{
                  width: '200px',
                  padding: '15px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
              >
                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>数值</h4>
                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                  {values?.map(({ value, total }, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        borderBottom: '1px solid #e9ecef',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: '500',
                          marginRight: '8px',
                          wordBreak: 'break-all',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={value}
                      >
                        {value}
                      </span>
                      <span
                        style={{
                          color: CHART_COLORS[0],
                          fontWeight: 'bold',
                          fontSize: '12px',
                        }}
                      >
                        {total}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </LoadingPanel>
  );
}

export default EventProperties;
