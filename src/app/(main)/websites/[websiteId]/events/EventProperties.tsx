import { GridColumn, GridTable } from 'react-basics';
import { useEventDataProperties, useEventDataValues, useMessages } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import Chart from '@/components/charts/Chart';
import { useState } from 'react';
import { CHART_COLORS } from '@/lib/constants';
import { formatLongNumber } from '@/lib/format';

import { useTheme } from '@/components/hooks';
import styles from './EventProperties.module.css';

export function EventProperties({
  websiteId,
  onPropertyChange,
}: {
  websiteId: string;
  onPropertyChange?: (propertyName: string) => void;
}) {
  const [propertyName, setPropertyName] = useState('');
  const [eventName, setEventName] = useState('');
  const [tooltip, setTooltip] = useState(null);
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
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
              maxBarThickness: 40, // 设置柱子最大宽度为40px
            },
          ],
        }
      : null;

  const chartOptions = {
    plugins: {
      legend: {
        display: false, // 隐藏图例
      },
      tooltip: {
        enabled: false, // 禁用默认tooltip
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
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
      duration: 400, // 缩短动画时间
    },
  };

  const handleRowClick = row => {
    setEventName(row.eventName);
    setPropertyName(row.propertyName);
    onPropertyChange?.(row.propertyName);
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
            <div className={styles.header}>
              <div className={styles.title}>
                {eventName} （{propertyName}）
              </div>
              <div className={styles.toggleButtons}>
                <button
                  className={`${styles.toggleButton} ${viewMode === 'chart' ? styles.active : ''}`}
                  onClick={() => setViewMode('chart')}
                >
                  柱状图
                </button>
                <button
                  className={`${styles.toggleButton} ${viewMode === 'list' ? styles.active : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  列表
                </button>
              </div>
            </div>

            {viewMode === 'chart' ? (
              <div style={{ width: '100%' }}>
                <Chart
                  key={propertyName + eventName}
                  type="bar"
                  data={chartData}
                  tooltip={tooltip}
                  onTooltip={handleTooltip}
                  chartOptions={chartOptions}
                  onCreate={(chart: any) => {
                    const drawDataLabels = () => {
                      const ctx = chart.ctx;
                      ctx.save();
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillStyle = '#fff';
                      ctx.font = 'bold 16px Arial';
                      ctx.shadowColor = 'rgba(0,0,0,0.5)';
                      ctx.shadowBlur = 2;

                      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
                        const meta = chart.getDatasetMeta(datasetIndex);
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
                    };

                    chart.options.plugins = chart.options.plugins || {};
                    chart.options.animation = {
                      ...chart.options.animation,
                      onComplete: drawDataLabels,
                    };
                  }}
                  onUpdate={(chart: any) => {
                    const drawDataLabels = () => {
                      const ctx = chart.ctx;
                      ctx.save();
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillStyle = '#fff';
                      ctx.font = 'bold 16px Arial';
                      ctx.shadowColor = 'rgba(0,0,0,0.5)';
                      ctx.shadowBlur = 2;

                      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
                        const meta = chart.getDatasetMeta(datasetIndex);
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
                    };

                    chart.options.animation = {
                      ...chart.options.animation,
                      onComplete: drawDataLabels,
                    };
                  }}
                />
              </div>
            ) : (
              <div className={styles.listView}>
                <div className={styles.listContainer}>
                  <div className={styles.listHeader}>
                    <div className={styles.listHeaderItem}>属性值</div>
                    <div className={styles.listHeaderCount}>数量</div>
                  </div>
                  <div className={styles.listBody}>
                    {values?.map(({ value, total }, index) => (
                      <div key={index} className={styles.listRow}>
                        <div className={styles.listValue} title={value}>
                          {value}
                        </div>
                        <div className={styles.listCount}>{total}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </LoadingPanel>
  );
}

export default EventProperties;
