"use client";

import { useEffect, useState } from "react";

import { request } from "@/src/api";
import type { RegistrationRewardConfig } from "@/src/types";
import { errorMessage, formatDateTime } from "@/src/ui";

type RegistrationRewardViewProps = {
  refreshToken: number;
  onLoaded: () => void;
  onLoadingChange: (loading: boolean) => void;
  showToast: (message: string, tone?: "success" | "error") => void;
};

export function RegistrationRewardView({
  refreshToken,
  onLoaded,
  onLoadingChange,
  showToast,
}: RegistrationRewardViewProps) {
  const [config, setConfig] = useState<RegistrationRewardConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setConfig(null);
        setError(null);
        onLoadingChange(true);
      }
    });

    void request<RegistrationRewardConfig>(
      "/admin/features/registration-reward",
      { signal: controller.signal },
    )
      .then((result) => {
        setConfig(result);
        onLoaded();
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
  }, [onLoaded, onLoadingChange, refreshToken, retryToken]);

  const update = async (enabled: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const result = await request<RegistrationRewardConfig>(
        "/admin/features/registration-reward",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ enabled }),
        },
      );
      setConfig(result);
      showToast(enabled ? "已开放鸿蒙注册奖励提现" : "已关闭注册奖励提现");
      onLoaded();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (error && !config) {
    return (
      <section className="state-panel state-panel--error" role="alert">
        <span className="state-panel__icon">!</span>
        <div>
          <h2>注册奖励配置加载失败</h2>
          <p>{error}</p>
        </div>
        <button
          className="button button--secondary"
          onClick={() => setRetryToken((value) => value + 1)}
        >
          重新加载
        </button>
      </section>
    );
  }

  if (!config) {
    return <section className="panel skeleton-panel skeleton-review" />;
  }

  return (
    <>
      <section className="dashboard-heading" aria-labelledby="reward-title">
        <div>
          <p className="section-kicker">增长活动</p>
          <h2 id="reward-title">鸿蒙注册奖励提现</h2>
          <p className="section-description">
            仅鸿蒙客户端展示。华为 DeviceVerify 判定同一设备是否已领取，卸载重装后仍只可领取一次。
          </p>
        </div>
        <span
          className={`config-status ${config.enabled ? "is-enabled" : ""}`}
        >
          {config.enabled ? "已开放" : "已关闭"}
        </span>
      </section>

      <section className="panel review-config-card">
        <div className="review-config-card__summary">
          <div>
            <span>当前状态</span>
            <strong>{config.enabled ? "活动开放中" : "活动已关闭"}</strong>
          </div>
          <p>
            {config.updatedAt
              ? `最后更新：${formatDateTime(config.updatedAt)}`
              : "尚未更新"}
          </p>
        </div>

        <div className="review-config-form">
          <label>领取数据</label>
          <p className="field-help">
            已锁定设备 {config.claimedCount} 台，其中成功 {config.successfulCount} 台、处理中 {config.processingCount} 台、失败 {config.failedCount} 台、已撤销 {config.cancelledCount} 台。
          </p>
          <p className="field-help">
            客户端固定展示“随机1~10元”，服务端实际随机发放 1.00~1.10 元。
          </p>
          <p className="form-error" role="alert">
            {error}
          </p>
          <div className="review-config-form__footer">
            <p>
              正式开放前，请先确认华为服务账号和微信商家转账密钥已在服务端配置。
            </p>
            <button
              className={`button ${
                config.enabled ? "button--danger" : "button--primary"
              }`}
              type="button"
              disabled={busy}
              onClick={() => void update(!config.enabled)}
            >
              {busy
                ? "处理中…"
                : config.enabled
                  ? "关闭活动"
                  : "开放活动"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
