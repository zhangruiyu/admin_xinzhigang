import type { DashboardStats } from "@/src/types";
import { formatNumber, formatShortDate } from "@/src/ui";

export function DailyChart({ stats }: { stats: DashboardStats }) {
  const values = stats.dailyRegistrations;
  if (values.length === 0) {
    return <div className="empty-compact">所选时间范围暂无注册数据</div>;
  }

  const width = 760;
  const height = 250;
  const left = 42;
  const right = 18;
  const top = 24;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxCount = Math.max(1, ...values.map((item) => item.count));
  const points = values.map((item, index) => {
    const x =
      values.length === 1
        ? left + chartWidth / 2
        : left + (chartWidth * index) / (values.length - 1);
    const y = top + chartHeight - (chartHeight * item.count) / maxCount;
    return { x, y };
  });
  const linePoints = points
    .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaPoints = `${left},${top + chartHeight} ${linePoints} ${
    left + chartWidth
  },${top + chartHeight}`;
  const labelStep = Math.max(1, Math.ceil(values.length / 6));

  return (
    <div className="chart-wrap">
      <svg
        className="line-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`最近 ${stats.range.days} 天每日注册人数折线图`}
      >
        <title>最近 {stats.range.days} 天每日注册人数</title>
        {[0, 0.5, 1].map((ratio) => {
          const y = top + chartHeight * ratio;
          const label = Math.round(maxCount * (1 - ratio));
          return (
            <g key={ratio}>
              <line
                x1={left}
                y1={y}
                x2={left + chartWidth}
                y2={y}
                className="chart-grid"
              />
              <text
                x={left - 10}
                y={y + 4}
                textAnchor="end"
                className="chart-axis"
              >
                {label}
              </text>
            </g>
          );
        })}
        <polygon points={areaPoints} className="chart-area" />
        <polyline points={linePoints} className="chart-line" />
        {values.map((item, index) => {
          const { x, y } = points[index];
          return (
            <circle
              key={item.date}
              cx={x}
              cy={y}
              r="4"
              className="chart-dot"
              tabIndex={0}
            >
              <title>
                {item.date}：{formatNumber(item.count)} 人
              </title>
            </circle>
          );
        })}
        {values.map((item, index) => {
          if (index % labelStep !== 0 && index !== values.length - 1) {
            return null;
          }
          return (
            <text
              key={item.date}
              x={points[index].x}
              y={height - 13}
              textAnchor="middle"
              className="chart-axis"
            >
              {formatShortDate(item.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function ChannelBars({ stats }: { stats: DashboardStats }) {
  if (stats.channelRegistrations.length === 0) {
    return (
      <div className="empty-compact">所选时间范围暂无渠道注册数据</div>
    );
  }
  const channels = stats.channelRegistrations.slice(0, 6);
  const max = Math.max(1, ...channels.map((item) => item.count));

  return (
    <div className="channel-bars">
      {channels.map((item) => (
        <div className="channel-bar" key={item.channel}>
          <div className="channel-bar__label">
            <span title={item.channel}>{channelLabel(item.channel)}</span>
            <strong>{formatNumber(item.count)}</strong>
          </div>
          <div className="channel-bar__track" aria-hidden="true">
            <span
              style={{
                width: `${Math.max(3, (item.count / max) * 100).toFixed(1)}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChannelTable({ stats }: { stats: DashboardStats }) {
  if (stats.channelRegistrations.length === 0) {
    return <div className="empty-compact">暂无渠道明细</div>;
  }
  const total = stats.channelRegistrations.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">渠道</th>
            <th scope="col">注册人数</th>
            <th scope="col">占比</th>
          </tr>
        </thead>
        <tbody>
          {stats.channelRegistrations.map((item) => (
            <tr key={item.channel}>
              <td>
                <span className="channel-name">
                  {channelLabel(item.channel)}
                </span>
                <small>{item.channel}</small>
              </td>
              <td>{formatNumber(item.count)}</td>
              <td>
                {total === 0
                  ? "0.0"
                  : ((item.count / total) * 100).toFixed(1)}
                %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function channelLabel(channel: string): string {
  const labels: Record<string, string> = {
    unknown: "未知渠道",
    test: "测试渠道",
    ios: "iOS",
    web: "网页",
    huawei: "华为",
    honor: "荣耀",
    oppo: "OPPO",
    vivo: "vivo",
    xiaomi: "小米",
  };
  return labels[channel] ?? channel;
}
