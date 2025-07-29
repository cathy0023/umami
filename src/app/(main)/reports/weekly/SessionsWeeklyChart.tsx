'use client';
import { useWebsiteSessionsWeekly } from '@/components/hooks';
import { startOfWeek, endOfWeek } from 'date-fns';
import styles from './SessionsWeeklyChart.module.css';
import { useEffect, useState } from 'react';

// 创建模拟数据函数
function createMockData() {
  // 创建7天的数据，每天24小时
  return Array(7)
    .fill(null)
    .map(() =>
      Array(24)
        .fill(0)
        .map(() => Math.floor(Math.random() * 50)),
    );
}

export default function SessionsWeeklyChart({ websiteId }: { websiteId: string }) {
  const startDate = startOfWeek(new Date());
  const endDate = endOfWeek(new Date());
  const [useMockData, setUseMockData] = useState(false);
  const [mockData, setMockData] = useState(null);

  const { data, error, isLoading } = useWebsiteSessionsWeekly(websiteId, {
    startAt: startDate.getTime(),
    endAt: endDate.getTime(),
    timezone: 'Asia/Shanghai',
  });

  useEffect(() => {
    // 如果加载失败或者5秒后仍然没有数据，使用模拟数据
    if (error || (!data && !isLoading)) {
      setUseMockData(true);
      setMockData(createMockData());
    }

    const timer = setTimeout(() => {
      if (!data && !mockData) {
        setUseMockData(true);
        setMockData(createMockData());
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [data, error, isLoading, mockData]);

  // 如果使用模拟数据，则显示模拟数据，否则显示API返回的数据
  const chartData = useMockData ? mockData : data;

  if (isLoading && !chartData) {
    return (
      <div className={styles.chartContainer}>
        <p>加载中...</p>
      </div>
    );
  }

  // 如果没有数据（真实或模拟），显示默认图表
  if (!chartData) {
    const defaultData = Array(7)
      .fill(null)
      .map(() => Array(24).fill(0));
    return (
      <div className={styles.chartContainer}>
        <div className={styles.weeklyChart}>
          {defaultData.map((day, i) => (
            <div key={i} className={styles.dayColumn}>
              <div className={styles.dayLabel}>
                {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][i]}
              </div>
              <div className={styles.hourBars}></div>
            </div>
          ))}
        </div>
        {useMockData && <div className={styles.mockDataNotice}>使用模拟数据显示</div>}
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.weeklyChart}>
        {chartData.map((day, i) => (
          <div key={i} className={styles.dayColumn}>
            <div className={styles.dayLabel}>
              {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][i]}
            </div>
            <div className={styles.hourBars}>
              {day.map((hour, j) => {
                const height = hour > 0 ? Math.max(hour / 10, 3) : 0;
                return (
                  <div
                    key={j}
                    className={styles.hourBar}
                    style={{ height: `${height}px` }}
                    title={`${j}:00 - ${j + 1}:00, 访问量: ${hour}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {useMockData && <div className={styles.mockDataNotice}>使用模拟数据显示</div>}
    </div>
  );
}
