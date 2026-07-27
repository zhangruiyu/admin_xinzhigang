const dashboardTimeZone = 'Asia/Shanghai';

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-CN').format(value);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '时间未知';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: dashboardTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatShortDate(value: string): string {
  const [, month = '', day = ''] = value.split('-');
  return `${Number(month)}/${Number(day)}`;
}

export function formatMs(value: number): string {
  const totalSeconds = Math.max(0, value) / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)} 秒`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes} 分 ${seconds} 秒`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
