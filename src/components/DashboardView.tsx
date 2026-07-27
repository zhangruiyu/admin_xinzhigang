"use client";

import { useEffect, useState } from "react";

import { request } from "@/src/api";
import type { DashboardStats } from "@/src/types";
import { errorMessage, formatNumber } from "@/src/ui";

import {
  ChannelBars,
  ChannelTable,
  DailyChart,
} from "./dashboard-parts";

type DashboardViewProps = {
  refreshToken: number;
  onLoaded: (pendingCount: number) => void;
  onLoadingChange: (loading: boolean) => void;
};

const ranges = [7, 30, 90] as const;

export function DashboardView({
  refreshToken,
  onLoaded,
  onLoadingChange,
}: DashboardViewProps) {
  const [activeDays, setActiveDays] = useState(30);
  const [retryToken, setRetryToken] = useState(0);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setError(null);
        onLoadingChange(true);
      }
    });

    void request<DashboardStats>(
      `/admin/dashboard/stats?days=${activeDays}`,
      { signal: controller.signal },
    )
      .then((result) => {
        setActiveDays(result.range.days);
        setStats(result);
        onLoaded(result.pendingReviewCount);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(reason));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          onLoadingChange(false);
        }
      });

    return () => {
      controller.abort();
      queueMicrotask(() => onLoadingChange(false));
    };
  }, [
    activeDays,
    onLoaded,
    onLoadingChange,
    refreshToken,
    retryToken,
  ]);

  if (error) {
    return (
      <section className="state-panel state-panel--error" role="alert">
        <span className="state-panel__icon">!</span>
        <div>
          <h2>数据概览加载失败</h2>
          <p>{error}</p>
        </div>
        <button
          className="button button--secondary"
          onClick={() => {
            setError(null);
            setStats(null);
            setRetryToken((value) => value + 1);
          }}
        >
          重新加载
        </button>
      </section>
    );
  }

  if (!stats) {
    return <DashboardSkeleton />;
  }

  const rangeTotal = stats.dailyRegistrations.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  return (
    <>
      <section
        className="dashboard-heading"
        aria-labelledby="dashboard-title"
      >
        <div>
          <p className="section-kicker">运营数据</p>
          <h2 id="dashboard-title">应用概览</h2>
          <p className="section-description">
            {stats.range.startDate} 至 {stats.range.endDate} · 按北京时间统计
          </p>
        </div>
        <div className="range-switcher" aria-label="选择统计范围">
          {ranges.map((days) => (
            <button
              key={days}
              className={`range-button${
                days === stats.range.days ? " is-active" : ""
              }`}
              aria-pressed={days === stats.range.days}
              onClick={() => {
                setStats(null);
                setError(null);
                setActiveDays(days);
              }}
            >
              近 {days} 天
            </button>
          ))}
        </div>
      </section>

      <section className="metric-grid" aria-label="核心指标">
        <MetricCard
          label="总注册用户"
          value={stats.totalUsers}
          description="累计创建的应用账号"
          index="01"
        />
        <MetricCard
          label="今日注册"
          value={stats.todayRegistrations}
          description="北京时间 00:00 起"
          index="02"
        />
        <MetricCard
          label="待审核音频"
          value={stats.pendingReviewCount}
          description="等待处理的公开申请"
          index="03"
          highlight
        />
      </section>

      <section className="analytics-grid">
        <article className="panel panel--trend">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">注册趋势</p>
              <h3>每日注册人数</h3>
            </div>
            <span className="panel-note">
              共 {formatNumber(rangeTotal)} 人
            </span>
          </div>
          <DailyChart stats={stats} />
        </article>

        <article className="panel panel--channels">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">首次归因</p>
              <h3>渠道注册人数</h3>
            </div>
            <span className="panel-note">
              {formatNumber(stats.channelRegistrations.length)} 个渠道
            </span>
          </div>
          <ChannelBars stats={stats} />
        </article>
      </section>

      <section className="panel channel-table-panel">
        <div className="panel-heading">
          <div>
            <p className="section-kicker">精确数据</p>
            <h3>渠道明细</h3>
          </div>
          <span className="panel-note">首次注册渠道，不随后续登录变化</span>
        </div>
        <ChannelTable stats={stats} />
      </section>
    </>
  );
}

function MetricCard({
  label,
  value,
  description,
  index,
  highlight = false,
}: {
  label: string;
  value: number;
  description: string;
  index: string;
  highlight?: boolean;
}) {
  return (
    <article
      className={`metric-card${highlight ? " metric-card--highlight" : ""}`}
    >
      <div className="metric-card__top">
        <span>{label}</span>
        <span className="metric-card__index" aria-hidden="true">
          {index}
        </span>
      </div>
      <strong>{formatNumber(value)}</strong>
      <p>{description}</p>
    </article>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <section
        className="dashboard-heading skeleton-heading"
        aria-busy="true"
        aria-label="正在加载数据概览"
      >
        <div>
          <span className="skeleton skeleton--label" />
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--text" />
        </div>
      </section>
      <section className="metric-grid" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="metric-card skeleton-card" key={index} />
        ))}
      </section>
      <section className="analytics-grid" aria-hidden="true">
        <div className="panel skeleton-panel" />
        <div className="panel skeleton-panel" />
      </section>
    </>
  );
}
