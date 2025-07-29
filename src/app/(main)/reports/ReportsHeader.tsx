import PageHeader from '@/components/layout/PageHeader';
import { Icon, Icons, Text } from 'react-basics';
import { useLogin, useMessages, useTeamUrl } from '@/components/hooks';
import LinkButton from '@/components/common/LinkButton';
import { ROLES } from '@/lib/constants';
// import Calendar from '@/assets/calendar.svg';

export function ReportsHeader() {
  const { formatMessage, labels } = useMessages();
  const { renderTeamUrl } = useTeamUrl();
  const { user } = useLogin();
  const canEdit = user.role !== ROLES.viewOnly;

  return (
    <PageHeader title={formatMessage(labels.reports)}>
      <div style={{ display: 'flex', gap: '10px' }}>
        {/* <LinkButton href={renderTeamUrl('/reports/weekly')} variant="secondary">
          <Icon>
            <Calendar />
          </Icon>
          <Text>查看周报</Text>
        </LinkButton> */}
        {canEdit && (
          <LinkButton href={renderTeamUrl('/reports/create')} variant="primary">
            <Icon>
              <Icons.Plus />
            </Icon>
            <Text>{formatMessage(labels.createReport)}</Text>
          </LinkButton>
        )}
      </div>
    </PageHeader>
  );
}

export default ReportsHeader;
