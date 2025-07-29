'use client';
import { useState, useEffect } from 'react';
import { useWebsites, useTeamUrl } from '@/components/hooks';
import { Button, Flexbox, Text, Icon } from 'react-basics';
import PageHeader from '@/components/layout/PageHeader';
import WebsiteSelect from '@/components/input/WebsiteSelect';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { useRouter } from 'next/navigation';
import Icons from '@/components/icons';
import MetricCard from '@/components/metrics/MetricCard';
import SessionsWeeklyChart from './SessionsWeeklyChart';
import styles from './WeeklyReportPage.module.css';

export default function WeeklyReportPage() {
  const websites = useWebsites({});
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>('');
  const { renderTeamUrl } = useTeamUrl();
  const router = useRouter();

  const today = new Date();
  const startDate = startOfWeek(today);
  const endDate = endOfWeek(today);
  const dateRange = `${format(startDate, 'yyyy-MM-dd')} ~ ${format(endDate, 'yyyy-MM-dd')}`;

  useEffect(() => {
    if (websites?.result?.data?.length > 0 && !selectedWebsiteId) {
      setSelectedWebsiteId(websites.result.data[0].id);
    }
  }, [websites, selectedWebsiteId]);

  const handleWebsiteChange = websiteId => {
    setSelectedWebsiteId(websiteId);
  };

  const handleBack = () => {
    router.push(renderTeamUrl('/reports'));
  };

  const isLoading = websites.query.isLoading || !selectedWebsiteId;

  return (
    <>
      <PageHeader title="网站周报">
        <Button onClick={handleBack} variant="secondary">
          <Icon>
            <Icons.ArrowRight style={{ transform: 'rotate(180deg)' }} />
          </Icon>
          <Text>返回</Text>
        </Button>
      </PageHeader>

      <div className={styles.container}>
        <Flexbox justifyContent="space-between" alignItems="center">
          <div>
            <h2>本周数据统计报告</h2>
            <Text>{dateRange}</Text>
          </div>
          <div style={{ width: '200px' }}>
            {!websites.query.isLoading && (
              <WebsiteSelect websiteId={selectedWebsiteId} onSelect={handleWebsiteChange} />
            )}
          </div>
        </Flexbox>
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <p>正在加载网站数据...</p>
        </div>
      ) : (
        <>
          <div className={styles.metricsContainer}>
            <MetricCard label="访问量" value={1234} />
            <MetricCard label="独立访客" value={567} />
            <MetricCard label="页面浏览量" value={3456} />
            <MetricCard label="平均停留时间" value={120} formatValue={n => `${n}秒`} />
          </div>

          <div className={styles.grid}>
            <div className={styles.panel} style={{ gridColumn: '1 / 3' }}>
              <h3>本周访问量趋势</h3>
              <SessionsWeeklyChart websiteId={selectedWebsiteId} />
            </div>
            <div className={styles.panel}>
              <h3>热门页面</h3>
              <div>
                <p>热门页面列表将在这里显示</p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
