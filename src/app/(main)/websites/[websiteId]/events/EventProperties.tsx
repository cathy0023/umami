import { GridColumn, GridTable } from 'react-basics';
import { useEventDataProperties, useEventDataValues, useMessages } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import Chart from '@/components/charts/Chart';
import { useState } from 'react';
import { usePropertyChart } from '@/components/hooks/usePropertyChart';
import { PropertyChartPagination } from '@/components/common/PropertyChartPagination';
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

  const { formatMessage, labels } = useMessages();
  const { data, isLoading, isFetched, error } = useEventDataProperties(websiteId);
  const { data: values } = useEventDataValues(websiteId, eventName, propertyName);

  const {
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
  } = usePropertyChart({
    propertyName,
    data: values,
    initialItemsPerPage: 25,
  });

  const handleRowClick = row => {
    setEventName(row.eventName);
    setPropertyName(row.propertyName);
    resetPagination();
    onPropertyChange?.(row.propertyName);
  };

  return (
    <LoadingPanel isLoading={isLoading} isFetched={isFetched} data={data} error={error}>
      <div className={styles.container}>
        <GridTable data={data} cardMode={false} className={styles.table}>
          <GridColumn name="eventName" label={formatMessage(labels.event)}>
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

            {viewMode === 'chart' && chartData && (
              <div className={styles.chartView}>
                <Chart type="bar" data={chartData} chartOptions={chartOptions} />
              </div>
            )}

            {viewMode === 'list' && (
              <div className={styles.listView}>
                <div className={styles.listContainer}>
                  <div className={styles.listHeader}>
                    <div className={styles.listHeaderItem}>属性值</div>
                    <div className={styles.listHeaderCount}>数量</div>
                  </div>
                  <div className={styles.listBody}>
                    {currentPageData?.map(({ value, total }, index) => (
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

            {/* 分页控制 */}
            <PropertyChartPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              startIndex={startIndex}
              endIndex={endIndex}
              itemsPerPage={itemsPerPage}
              onPrevPage={handlePrevPage}
              onNextPage={handleNextPage}
              onPageClick={handlePageClick}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </div>
        )}
      </div>
    </LoadingPanel>
  );
}

export default EventProperties;
