import { useState, useMemo } from 'react';
import { useTheme } from '@/components/hooks';
import { CHART_COLORS } from '@/lib/constants';
import { formatLongNumber } from '@/lib/format';

export interface PropertyChartData {
  value: string;
  total: number;
}

export interface UsePropertyChartOptions {
  propertyName: string;
  data?: PropertyChartData[];
  initialItemsPerPage?: number;
}

export function usePropertyChart({
  propertyName,
  data,
  initialItemsPerPage = 25,
}: UsePropertyChartOptions) {
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);
  const { colors } = useTheme();

  // 计算分页数据
  const totalItems = data?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageData = data?.slice(startIndex, endIndex) || [];

  // 图表数据
  const chartData = useMemo(() => {
    if (!propertyName || currentPageData.length === 0) return null;

    return {
      datasets: [
        {
          label: propertyName,
          data: currentPageData.map(({ value, total }) => ({
            x: value,
            y: total,
          })),
          backgroundColor: CHART_COLORS[0],
          borderColor: CHART_COLORS[0],
          borderWidth: 1,
          maxBarThickness: 40,
        },
      ],
    };
  }, [propertyName, currentPageData]);

  // 图表配置
  const chartOptions = useMemo(
    () => ({
      layout: {
        padding: {
          top: 40, // 增加顶部边距以显示数值标签
          bottom: 10,
          left: 10,
          right: 10,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
          bodyFont: {
            size: 14,
          },
          titleFont: {
            size: 14,
          },
          callbacks: {
            title: function () {
              return '';
            },
            label: function (context: any) {
              return [
                `${propertyName}: ${context.raw.x}`,
                `数量: ${formatLongNumber(context.raw.y)}`,
              ];
            },
          },
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
        duration: 400,
        onComplete: function (animation: any) {
          const chart = animation.chart;
          const ctx = chart.ctx;

          chart.data.datasets.forEach((dataset: any, datasetIndex: number) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta.hidden) {
              meta.data.forEach((element: any, index: number) => {
                const value = dataset.data[index];
                const displayValue = typeof value === 'object' ? value.y : value;

                if (displayValue > 0) {
                  ctx.fillStyle = colors.chart.text;
                  ctx.font = 'bold 12px Inter';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'bottom';

                  const x = element.x;
                  const y = element.y - 5;

                  ctx.fillText(formatLongNumber(displayValue), x, y);
                }
              });
            }
          });
        },
      },
    }),
    [colors, propertyName],
  );

  // 分页控制函数
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const resetPagination = () => {
    setCurrentPage(1);
  };

  return {
    viewMode,
    setViewMode,
    currentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    itemsPerPage,
    currentPageData,
    chartData,
    chartOptions,
    handlePrevPage,
    handleNextPage,
    handlePageClick,
    handleItemsPerPageChange,
    resetPagination,
  };
}
