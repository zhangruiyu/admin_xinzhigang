"use client";

import { useEffect, useRef, useState } from "react";

import { request } from "@/src/api";
import type { AudioPackReport, PageData } from "@/src/types";
import { errorMessage, formatDateTime } from "@/src/ui";

import {
  ReportDialog,
  type ReportModalState,
} from "./ReportDialog";
import { PackVisual } from "./review-parts";

const pageSize = 10;

type ReportsViewProps = {
  refreshToken: number;
  onLoaded: () => void;
  onLoadingChange: (loading: boolean) => void;
  showToast: (message: string, tone?: "success" | "error") => void;
};

export function ReportsView({
  refreshToken,
  onLoaded,
  onLoadingChange,
  showToast,
}: ReportsViewProps) {
  const [offset, setOffset] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [page, setPage] = useState<PageData<AudioPackReport> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ReportModalState | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const detailRequest = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setPage(null);
        setError(null);
        onLoadingChange(true);
      }
    });

    void request<PageData<AudioPackReport>>(
      `/admin/audio_reports?offset=${offset}&limit=${pageSize}`,
      { signal: controller.signal },
    )
      .then((result) => {
        if (result.data.length === 0 && offset > 0) {
          setOffset((value) => Math.max(0, value - pageSize));
          return;
        }
        setPage(result);
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
  }, [offset, onLoaded, onLoadingChange, refreshToken, reloadToken]);

  const closeModal = () => {
    detailRequest.current += 1;
    setModal(null);
    queueMicrotask(() => {
      previousFocus.current?.focus();
      previousFocus.current = null;
    });
  };

  const openDetail = async (
    report: AudioPackReport,
    trigger: HTMLButtonElement,
  ) => {
    previousFocus.current = trigger;
    const requestId = ++detailRequest.current;
    setModal({ kind: "loading" });
    try {
      const result = await request<AudioPackReport>(
        `/admin/audio_reports/${report.id}`,
      );
      if (requestId === detailRequest.current) {
        setModal({ kind: "detail", report: result });
      }
    } catch (cause) {
      if (requestId === detailRequest.current) {
        setModal({ kind: "error", message: errorMessage(cause) });
      }
    }
  };

  const deletePack = async (report: AudioPackReport) => {
    await request<void>(`/admin/audio_packs/${report.packId}`, {
      method: "DELETE",
    });
    closeModal();
    showToast("作品已删除并从公开市场下架，投诉记录继续保留");
    setReloadToken((value) => value + 1);
  };

  return (
    <>
      {error ? (
        <section className="state-panel state-panel--error" role="alert">
          <span className="state-panel__icon">!</span>
          <div>
            <h2>投诉列表加载失败</h2>
            <p>{error}</p>
          </div>
          <button
            className="button button--secondary"
            onClick={() => {
              setPage(null);
              setError(null);
              setReloadToken((value) => value + 1);
            }}
          >
            重新加载
          </button>
        </section>
      ) : null}

      {!error && !page ? <ReportSkeleton /> : null}

      {page ? (
        <>
          <section className="dashboard-heading" aria-labelledby="report-title">
            <div>
              <p className="section-kicker">内容治理</p>
              <h2 id="report-title">用户投诉</h2>
              <p className="section-description">
                查看举报用户、音频包与具体投诉内容，核实后可直接删除作品。
              </p>
            </div>
            <span className="queue-summary">本页 {page.data.length} 条记录</span>
          </section>

          {page.data.length === 0 ? (
            <section className="state-panel state-panel--empty" role="status">
              <span className="state-panel__icon">✓</span>
              <div>
                <h2>暂无用户投诉</h2>
                <p>公开音频包被用户举报后会出现在这里。</p>
              </div>
            </section>
          ) : (
            <section className="review-list" aria-label="用户投诉列表">
              {page.data.map((report) => (
                <article className="review-card report-card" key={report.id}>
                  <PackVisual
                    value={report.pack.watchIconUrl}
                    title={report.pack.title}
                  />
                  <div className="review-card__body">
                    <div className="review-card__title-row">
                      <div>
                        <span
                          className={`status-pill${
                            report.packDeleted ? " status-pill--muted" : ""
                          }`}
                        >
                          {report.packDeleted ? "已下架" : report.reason}
                        </span>
                        <h3>{report.pack.title}</h3>
                      </div>
                      <time dateTime={report.createdAt}>
                        {formatDateTime(report.createdAt)}
                      </time>
                    </div>
                    <p className="review-card__description report-card__content">
                      {report.description || "用户未填写补充内容"}
                    </p>
                    <div className="review-meta">
                      <span>举报用户 ID：{report.userId}</span>
                      <span>音频包 ID：{report.packId}</span>
                      <span>作者：{report.pack.author.nickname}</span>
                    </div>
                  </div>
                  <div className="review-card__actions">
                    <button
                      className="button button--quiet"
                      onClick={(event) =>
                        void openDetail(report, event.currentTarget)
                      }
                    >
                      查看音频包详情
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}

          <ReportPagination
            page={page}
            onPrevious={() => {
              setPage(null);
              setOffset((value) => Math.max(0, value - pageSize));
            }}
            onNext={() => {
              setPage(null);
              setOffset((value) => value + pageSize);
            }}
          />
        </>
      ) : null}

      {modal ? (
        <ReportDialog
          key={`${modal.kind}-${
            "report" in modal ? modal.report.id : "standalone"
          }`}
          state={modal}
          onClose={closeModal}
          onChooseDelete={(report) => setModal({ kind: "delete", report })}
          onDelete={deletePack}
        />
      ) : null}
    </>
  );
}

function ReportPagination({
  page,
  onPrevious,
  onNext,
}: {
  page: PageData<AudioPackReport>;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (page.offset === 0 && !page.hasMore) {
    return null;
  }
  const pageNumber = Math.floor(page.offset / page.limit) + 1;
  return (
    <nav className="pagination" aria-label="投诉列表分页">
      <button
        className="button button--secondary"
        disabled={page.offset === 0}
        onClick={onPrevious}
      >
        上一页
      </button>
      <span>第 {pageNumber} 页</span>
      <button
        className="button button--secondary"
        disabled={!page.hasMore}
        onClick={onNext}
      >
        下一页
      </button>
    </nav>
  );
}

function ReportSkeleton() {
  return (
    <>
      <section
        className="dashboard-heading skeleton-heading"
        aria-busy="true"
        aria-label="正在加载投诉列表"
      >
        <div>
          <span className="skeleton skeleton--label" />
          <span className="skeleton skeleton--title" />
          <span className="skeleton skeleton--text" />
        </div>
      </section>
      <section className="review-list" aria-hidden="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="review-card skeleton-review" key={index} />
        ))}
      </section>
    </>
  );
}
