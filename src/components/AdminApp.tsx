"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { request } from "@/src/api";
import type { DashboardStats } from "@/src/types";

import { DashboardView } from "./DashboardView";
import { ReviewsView } from "./ReviewsView";

type AppRoute = "dashboard" | "reviews";
type ToastState = {
  message: string;
  tone: "success" | "error";
};

export function AdminApp() {
  const [activeRoute, setActiveRoute] = useState<AppRoute>("dashboard");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("尚未刷新");
  const [refreshToken, setRefreshToken] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markUpdated = useCallback(() => {
    setLastUpdated(
      `更新于 ${new Intl.DateTimeFormat("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(new Date())}`,
    );
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const stats = await request<DashboardStats>(
        "/admin/dashboard/stats?days=7",
      );
      setPendingCount(stats.pendingReviewCount);
    } catch {
      // 导航角标属于补充信息，当前页面负责展示可见错误。
    }
  }, []);

  const showToast = useCallback(
    (message: string, tone: "success" | "error" = "success") => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
      setToast({ message, tone });
      toastTimer.current = setTimeout(() => {
        setToast(null);
        toastTimer.current = null;
      }, 4200);
    },
    [],
  );

  useEffect(() => {
    const syncRoute = () => {
      setActiveRoute(
        window.location.hash === "#reviews" ? "reviews" : "dashboard",
      );
    };
    syncRoute();
    window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void request<DashboardStats>("/admin/dashboard/stats?days=7")
      .then((stats) => {
        if (!cancelled) {
          setPendingCount(stats.pendingReviewCount);
        }
      })
      .catch(() => {
        // 导航角标属于补充信息，当前页面负责展示可见错误。
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const handleDashboardLoaded = useCallback(
    (count: number) => {
      setPendingCount(count);
      markUpdated();
    },
    [markUpdated],
  );

  const handleReviewsLoaded = useCallback(() => {
    markUpdated();
  }, [markUpdated]);

  const handleReviewChanged = useCallback(() => {
    void refreshPendingCount();
  }, [refreshPendingCount]);

  const title = activeRoute === "dashboard" ? "数据概览" : "音频审核";

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <a
            className="brand"
            href="#dashboard"
            aria-label="钢化你的心管理后台首页"
          >
            <span className="brand__mark" aria-hidden="true">
              钢
            </span>
            <span>
              <strong>钢化你的心</strong>
              <small>运营管理后台</small>
            </span>
          </a>

          <nav className="primary-nav" aria-label="后台主导航">
            <a
              href="#dashboard"
              className={activeRoute === "dashboard" ? "is-active" : undefined}
              aria-current={
                activeRoute === "dashboard" ? "page" : undefined
              }
            >
              <span className="nav-index">01</span>
              <span>数据概览</span>
            </a>
            <a
              href="#reviews"
              className={activeRoute === "reviews" ? "is-active" : undefined}
              aria-current={activeRoute === "reviews" ? "page" : undefined}
            >
              <span className="nav-index">02</span>
              <span>音频审核</span>
              {pendingCount > 0 ? (
                <span
                  className="nav-badge"
                  aria-label={`${pendingCount} 条待审核`}
                >
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              ) : null}
            </a>
          </nav>

          <div className="sidebar__footer">
            <span className="connection-dot" aria-hidden="true" />
            <div>
              <strong>管理接口已连接</strong>
              <small>当前后台无需账号登录</small>
            </div>
          </div>
        </aside>

        <main className="workspace">
          <header className="workspace-bar">
            <div>
              <p className="workspace-bar__context">
                钢化你的心 · 内容与增长
              </p>
              <h1>{title}</h1>
            </div>
            <div className="workspace-bar__actions">
              <span className="last-updated" aria-live="polite">
                {lastUpdated}
              </span>
              <button
                className="button button--secondary refresh-button"
                disabled={isLoading}
                aria-busy={isLoading}
                onClick={() => setRefreshToken((value) => value + 1)}
              >
                <span aria-hidden="true">↻</span>
                刷新
              </button>
            </div>
          </header>

          <div className="view-root">
            {activeRoute === "dashboard" ? (
              <DashboardView
                refreshToken={refreshToken}
                onLoaded={handleDashboardLoaded}
                onLoadingChange={setIsLoading}
              />
            ) : (
              <ReviewsView
                refreshToken={refreshToken}
                onLoaded={handleReviewsLoaded}
                onChanged={handleReviewChanged}
                onLoadingChange={setIsLoading}
                showToast={showToast}
              />
            )}
          </div>
        </main>
      </div>

      <div className="toast-root" aria-live="polite" aria-atomic="true">
        {toast ? (
          <div
            className={`toast toast--${toast.tone}`}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <span aria-hidden="true">
              {toast.tone === "error" ? "!" : "✓"}
            </span>
            <p>{toast.message}</p>
          </div>
        ) : null}
      </div>
    </>
  );
}
