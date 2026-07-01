import type { ActivityLog } from '@/shared/types/activityLog';

const ACTIVITY_LOG_EXPORT_COLUMNS = [
  '_id',
  'timestamp',
  'username',
  'userId',
  'action',
  'resource',
  'resourceId',
  'resourceName',
  'description',
  'ipAddress',
] as const;

function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  const stringValue =
    typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\n\r]/.test(stringValue)
    ? `"${stringValue.replace(/"/g, '""')}"`
    : stringValue;
}

function getExportValue(log: ActivityLog, column: string): unknown {
  if (column === 'timestamp') {
    const timestamp = log.timestamp;
    if (timestamp instanceof Date) return timestamp.toISOString();
    return timestamp ?? '';
  }
  return log[column as keyof ActivityLog] ?? '';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportActivityLogs(
  logs: ActivityLog[],
  format: 'csv' | 'json',
  filenamePrefix = 'activity-logs'
): void {
  if (logs.length === 0) return;

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(logs, null, 2)], {
      type: 'application/json',
    });
    downloadBlob(blob, `${filenamePrefix}-${logs.length}.json`);
    return;
  }

  const lines = [ACTIVITY_LOG_EXPORT_COLUMNS.join(',')];
  for (const log of logs) {
    lines.push(
      ACTIVITY_LOG_EXPORT_COLUMNS.map(column =>
        escapeCsvValue(getExportValue(log, column))
      ).join(',')
    );
  }
  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8',
  });
  downloadBlob(blob, `${filenamePrefix}-${logs.length}.csv`);
}
