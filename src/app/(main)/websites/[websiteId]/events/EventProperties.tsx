import { useState, useMemo } from 'react';
import { GridColumn, GridTable } from 'react-basics';
import { useEventDataProperties, useEventDataValues, useMessages } from '@/components/hooks';
import { LoadingPanel } from '@/components/common/LoadingPanel';
import Chart from '@/components/charts/Chart';
import { usePropertyChart } from '@/components/hooks/usePropertyChart';
import { PropertyChartPagination } from '@/components/common/PropertyChartPagination';
import { SearchField } from 'react-basics';
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
  const [search, setSearch] = useState('');

  const { formatMessage, labels } = useMessages();
  const { data, isLoading, isFetched, error } = useEventDataProperties(websiteId);
  const { data: values } = useEventDataValues(websiteId, eventName, propertyName);

  // 过滤数据 - 支持事件名称和属性名称的模糊搜索
  const filteredData = useMemo(() => {
    if (!data || !search) return data;

    return data.filter(
      item =>
        item.eventName.toLowerCase().includes(search.toLowerCase()) ||
        item.propertyName.toLowerCase().includes(search.toLowerCase()),
    );
  }, [data, search]);

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

  const handleSearch = (searchValue: string) => {
    setSearch(searchValue);
  };

  // 计算属性值总数
  const totalCount = useMemo(() => {
    if (!values || !Array.isArray(values) || values.length === 0) {
      return 0;
    }

    return values.reduce((sum, item) => {
      if (!item || typeof item !== 'object') {
        return sum;
      }

      const total = Number(item.total);
      if (isNaN(total) || total < 0) {
        return sum;
      }

      return sum + total;
    }, 0);
  }, [values]);

  // 渲染总数显示
  const renderTotalCount = () => {
    if (totalCount <= 0) {
      return null;
    }

    return <span className={styles.totalCount}> 浏览次数 [{totalCount}]</span>;
  };

  return (
    <LoadingPanel isLoading={isLoading} isFetched={isFetched} data={data} error={error}>
      <div className={styles.container}>
        <div className={styles.tableSection}>
          <div className={styles.searchSection}>
            <SearchField
              className={styles.searchField}
              value={search}
              onSearch={handleSearch}
              delay={300}
              placeholder="搜索事件"
            />
          </div>
          <GridTable data={filteredData} cardMode={false} className={styles.table}>
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
        </div>

        {eventName && propertyName && (
          <div className={styles.chart}>
            <div className={styles.header}>
              <div className={styles.title}>
                {eventName} （{propertyName}）{renderTotalCount()}
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

            {values && values.length > 0 && (
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
            )}
          </div>
        )}
      </div>
    </LoadingPanel>
  );
}

export default EventProperties;
