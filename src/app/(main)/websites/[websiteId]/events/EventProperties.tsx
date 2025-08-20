import { useState, useMemo } from 'react';
import { GridColumn, GridTable } from 'react-basics';
import {
  useEventDataProperties,
  useEventDataValues,
  useEventDataDetails,
  useMessages,
} from '@/components/hooks';
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

  // 详情模式状态
  const [detailsViewMode, setDetailsViewMode] = useState<'chart' | 'list' | 'details'>('chart');
  const [detailsPage, setDetailsPage] = useState(1);
  const [detailsLimit, setDetailsLimit] = useState(25);

  const { formatMessage, labels } = useMessages();
  const { data, isLoading, isFetched, error } = useEventDataProperties(websiteId);
  const { data: values } = useEventDataValues(websiteId, eventName, propertyName);

  // 详情数据获取 - 数据透视分析
  const { data: detailsData, isLoading: detailsLoading } = useEventDataDetails(
    websiteId,
    eventName,
    propertyName,
    {
      page: detailsPage,
      limit: detailsLimit,
      enabled: detailsViewMode === 'details' && !!(eventName && propertyName),
    },
  );

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

  // 详情模式分页处理
  const handleDetailsViewChange = (mode: 'chart' | 'list' | 'details') => {
    if (mode === 'details') {
      setDetailsViewMode('details');
      setDetailsPage(1); // 重置详情分页
    } else {
      setDetailsViewMode(mode);
      setViewMode(mode); // 同步到 usePropertyChart
    }
  };

  const handleDetailsPrevPage = () => {
    setDetailsPage(Math.max(1, detailsPage - 1));
  };

  const handleDetailsNextPage = () => {
    if (detailsData?.pagination) {
      setDetailsPage(Math.min(detailsData.pagination.pages, detailsPage + 1));
    }
  };

  const handleDetailsPageClick = (page: number) => {
    setDetailsPage(page);
  };

  const handleDetailsItemsPerPageChange = (limit: number) => {
    setDetailsLimit(limit);
    setDetailsPage(1); // 重置到第一页
  };

  // 属性名显示格式化
  const getPropertyDisplayName = (propertyName: string) => {
    const displayNames: Record<string, string> = {
      user_name: '用户名',
      org_name: '组织名',
      click_type: '点击类型',
      topic_name: '主题名称',
    };
    return displayNames[propertyName] || propertyName;
  };

  const handleRowClick = row => {
    setEventName(row.eventName);
    setPropertyName(row.propertyName);
    resetPagination();
    // 重置详情模式状态
    setDetailsViewMode('chart');
    setDetailsPage(1);
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
                  className={`${styles.toggleButton} ${
                    detailsViewMode === 'chart' ? styles.active : ''
                  }`}
                  onClick={() => handleDetailsViewChange('chart')}
                >
                  柱状图
                </button>
                <button
                  className={`${styles.toggleButton} ${
                    detailsViewMode === 'list' ? styles.active : ''
                  }`}
                  onClick={() => handleDetailsViewChange('list')}
                >
                  列表
                </button>
                <button
                  className={`${styles.toggleButton} ${
                    detailsViewMode === 'details' ? styles.active : ''
                  }`}
                  onClick={() => handleDetailsViewChange('details')}
                >
                  详情
                </button>
              </div>
            </div>

            {detailsViewMode === 'chart' && chartData && (
              <div className={styles.chartView}>
                <Chart type="bar" data={chartData} chartOptions={chartOptions} />
              </div>
            )}

            {detailsViewMode === 'list' && (
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

            {detailsViewMode === 'details' && (
              <div className={styles.detailsView}>
                {detailsLoading ? (
                  <div className={styles.loading}>加载中...</div>
                ) : detailsData?.data && detailsData.data.length > 0 ? (
                  <div className={styles.detailsTable}>
                    <div className={styles.detailsHeader}>
                      {/* 第一列：选中属性名作为列标题 */}
                      <div className={styles.detailsHeaderItem}>
                        {getPropertyDisplayName(detailsData.selectedProperty)}
                      </div>
                      {/* 动态渲染其他属性列（排除选中的主属性） */}
                      {detailsData.allProperties
                        .filter(prop => prop !== detailsData.selectedProperty)
                        .map(prop => (
                          <div key={prop} className={styles.detailsHeaderItem}>
                            {getPropertyDisplayName(prop)}
                          </div>
                        ))}
                      <div className={styles.detailsHeaderCount}>触发次数</div>
                    </div>
                    <div className={styles.detailsBody}>
                      {detailsData.data.map((row, index) => (
                        <div key={index} className={styles.detailsRow}>
                          {/* 第一列：选中属性的值 */}
                          <div className={styles.detailsCell} title={row.selectedPropertyValue}>
                            {row.selectedPropertyValue || '-'}
                          </div>
                          {/* 动态渲染其他属性值 */}
                          {detailsData.allProperties
                            .filter(prop => prop !== detailsData.selectedProperty)
                            .map(prop => (
                              <div
                                key={prop}
                                className={styles.detailsCell}
                                title={row.otherProperties[prop] || '-'}
                              >
                                {row.otherProperties[prop] || '-'}
                              </div>
                            ))}
                          <div className={styles.detailsCellCount}>{row.eventCount}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyState}>暂无详情数据</div>
                )}
              </div>
            )}

            {/* 分页组件 - 根据当前模式显示对应的分页 */}
            {detailsViewMode === 'details' && detailsData?.data && detailsData.data.length > 0 && (
              <PropertyChartPagination
                currentPage={detailsData.pagination.page}
                totalPages={detailsData.pagination.pages}
                totalItems={detailsData.pagination.total}
                startIndex={(detailsData.pagination.page - 1) * detailsData.pagination.limit + 1}
                endIndex={Math.min(
                  detailsData.pagination.page * detailsData.pagination.limit,
                  detailsData.pagination.total,
                )}
                itemsPerPage={detailsData.pagination.limit}
                onPrevPage={handleDetailsPrevPage}
                onNextPage={handleDetailsNextPage}
                onPageClick={handleDetailsPageClick}
                onItemsPerPageChange={handleDetailsItemsPerPageChange}
              />
            )}

            {detailsViewMode !== 'details' && values && values.length > 0 && (
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
