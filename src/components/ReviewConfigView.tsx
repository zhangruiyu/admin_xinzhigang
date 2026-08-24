"use client";

import { type FormEvent, useEffect, useState } from "react";

import { request } from "@/src/api";
import type { OhosReviewConfig } from "@/src/types";
import { errorMessage, formatDateTime } from "@/src/ui";

type ReviewConfigViewProps = {
  refreshToken: number;
  onLoaded: () => void;
  onLoadingChange: (loading: boolean) => void;
  showToast: (message: string, tone?: "success" | "error") => void;
};

export function ReviewConfigView({
  refreshToken,
  onLoaded,
  onLoadingChange,
  showToast,
}: ReviewConfigViewProps) {
  const [config, setConfig] = useState<OhosReviewConfig | null>(null);
  const [reviewVersion, setReviewVersion] = useState("");
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

    void request<OhosReviewConfig>("/admin/review_config/ohos", {
      signal: controller.signal,
    })
      .then((result) => {
        setConfig(result);
        setReviewVersion(result.reviewVersion ?? "");
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

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = reviewVersion.trim();
    if (!value) {
      setError("请填写鸿蒙审核版本");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await updateConfig(value);
      setConfig(result);
      setReviewVersion(result.reviewVersion ?? "");
      showToast(`已启用鸿蒙 ${result.reviewVersion} 审核模式`);
      onLoaded();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await updateConfig(null);
      setConfig(result);
      setReviewVersion("");
      showToast("已停用鸿蒙审核模式");
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
          <h2>审核版本配置加载失败</h2>
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
      <section className="dashboard-heading" aria-labelledby="config-title">
        <div>
          <p className="section-kicker">渠道合规</p>
          <h2 id="config-title">鸿蒙审核版本</h2>
          <p className="section-description">
            仅当 channel、os 均为 ohos 且 App-Version 精确匹配时生效。
          </p>
        </div>
        <span
          className={`config-status ${config.enabled ? "is-enabled" : ""}`}
        >
          {config.enabled ? "已启用" : "未启用"}
        </span>
      </section>

      <section className="panel review-config-card">
        <div className="review-config-card__summary">
          <div>
            <span>当前审核版本</span>
            <strong>{config.reviewVersion ?? "未配置"}</strong>
          </div>
          <p>
            {config.updatedAt
              ? `最后更新：${formatDateTime(config.updatedAt)}`
              : "尚未更新"}
          </p>
        </div>

        <form className="review-config-form" onSubmit={save}>
          <label htmlFor="ohos-review-version">鸿蒙审核版本</label>
          <div className="review-config-form__row">
            <input
              id="ohos-review-version"
              name="reviewVersion"
              type="text"
              maxLength={64}
              autoComplete="off"
              disabled={busy}
              value={reviewVersion}
              placeholder="例如 3.0.0.1"
              onChange={(event) => {
                setReviewVersion(event.target.value);
                setError(null);
              }}
            />
            <button
              className="button button--primary"
              type="submit"
              disabled={busy || reviewVersion.trim().length === 0}
            >
              {busy ? "处理中…" : "保存并启用"}
            </button>
          </div>
          <p className="field-help">
            版本按字符串精确匹配，例如 3.0.0.1 与 3.0.0.2 是两个不同版本。
          </p>
          <p className="form-error" role="alert">
            {error}
          </p>
          <div className="review-config-form__footer">
            <p>
              停用后，鸿蒙市场和搜索立即恢复普通内容策略。
            </p>
            <button
              className="button button--danger"
              type="button"
              disabled={busy || !config.enabled}
              onClick={() => void disable()}
            >
              停用审核模式
            </button>
          </div>
        </form>
      </section>
    </>
  );
}

function updateConfig(reviewVersion: string | null) {
  return request<OhosReviewConfig>("/admin/review_config/ohos", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reviewVersion }),
  });
}
