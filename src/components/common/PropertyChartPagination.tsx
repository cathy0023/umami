import React from 'react';
import styles from './PropertyChartPagination.module.css';

interface PropertyChartPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  itemsPerPage: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageClick: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
}

export function PropertyChartPagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  itemsPerPage,
  onPrevPage,
  onNextPage,
  onPageClick,
  onItemsPerPageChange,
}: PropertyChartPaginationProps) {
  if (totalItems === 0) return null;

  // 计算显示的页码范围
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(1, currentPage - 2);
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={styles.pagination}>
      <div className={styles.paginationLeft}>
        <div className={styles.paginationInfo}>
          显示第 {startIndex + 1}-{Math.min(endIndex, totalItems)} 项，共 {totalItems} 项
        </div>
        <div className={styles.itemsPerPageSelector}>
          <span>每页显示：</span>
          <select
            value={itemsPerPage}
            onChange={e => onItemsPerPageChange(Number(e.target.value))}
            className={styles.itemsPerPageSelect}
          >
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={30}>30</option>
            <option value={35}>35</option>
            <option value={40}>40</option>
            <option value={45}>45</option>
            <option value={50}>50</option>
          </select>
          <span>条</span>
        </div>
      </div>

      <div className={styles.paginationControls}>
        <button
          className={styles.paginationButton}
          onClick={onPrevPage}
          disabled={currentPage === 1}
        >
          上一页
        </button>

        <div className={styles.pageNumbers}>
          {pageNumbers.map(page => (
            <button
              key={page}
              className={`${styles.pageNumber} ${page === currentPage ? styles.active : ''}`}
              onClick={() => onPageClick(page)}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          className={styles.paginationButton}
          onClick={onNextPage}
          disabled={currentPage === totalPages}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
