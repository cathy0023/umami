import { GridColumn, GridTable } from 'react-basics';
import { useEventDataProperties, useEventDataValues, useMessages } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import Chart from '@/components/charts/Chart';
import { useState } from 'react';
import { CHART_COLORS } from '@/lib/constants';
import { formatLongNumber } from '@/lib/format';
import { StatusLight } from 'react-basics';
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

  // 自定义插件：在柱子上显示数值
  const dataLabelsPlugin = {
    id: 'dataLabels',
    afterDatasetsDraw(chart: any) {
      const { ctx } = chart;

      chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta.hidden) {
          meta.data.forEach((bar: any, index: number) => {
            const value = dataset.data[index].y;

            ctx.save();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#000';
            ctx.font = 'bold 12px Inter';

            const x = bar.x;
            const y = bar.y - 5; // 在柱子顶部上方5px处显示

            ctx.fillText(value.toString(), x, y);
            ctx.restore();
          });
        }
      });
    },
  };

  const chartOptions = {
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
    // plugins配置移除，插件在onCreate中注册
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
          <div style={{ color: 'white', marginBottom: '4px' }}>{dataPoints[0].raw.x}</div>
          <StatusLight color={dataPoints[0].dataset.borderColor}>
            <span style={{ color: 'white' }}>{formatLongNumber(dataPoints[0].raw.y)} 次</span>
          </StatusLight>
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
          <GridColumn
            name="total"
            label={formatMessage(labels.count)}
            alignment="end"
            style={{ width: '80px' }}
          />
        </GridTable>
        {propertyName && (
          <div className={styles.chart}>
            <div className={styles.title}>{propertyName}</div>
            <Chart
              key={propertyName + eventName}
              type="bar"
              data={chartData}
              tooltip={tooltip}
              onTooltip={handleTooltip}
              chartOptions={chartOptions}
              onCreate={chart => {
                // 注册自定义插件
                if (!chart.config.plugins.find(p => p.id === 'dataLabels')) {
                  chart.config.plugins.push(dataLabelsPlugin);
                }
              }}
            />
          </div>
        )}
      </div>
    </LoadingPanel>
  );
}

export default EventProperties;
