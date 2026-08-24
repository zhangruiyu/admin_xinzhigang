"use client";

import { useEffect, useRef, useState } from "react";

import { request } from "@/src/api";
import type { PageData, ReviewRequest } from "@/src/types";
import { errorMessage } from "@/src/ui";

import {
  ReviewDialog,
  type ReviewModalState,
} from "./ReviewDialog";
import {
  ReviewCard,
  ReviewPagination,
  ReviewSkeleton,
} from "./review-parts";

const pageSize = 10;

type ReviewsViewProps = {
  refreshToken: number;
  onLoaded: () => void;
  onChanged: () => void;
  onLoadingChange: (loading: boolean) => void;
  showToast: (message: string, tone?: "success" | "error") => void;
};

export function ReviewsView({
  refreshToken,
  onLoaded,
  onChanged,
  onLoadingChange,
  showToast,
}: ReviewsViewProps) {
  const [offset, setOffset] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [page, setPage] = useState<PageData<ReviewRequest> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ReviewModalState | null>(null);
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

    void request<PageData<ReviewRequest>>(
      `/admin/audio_review/pending?offset=${offset}&limit=${pageSize}`,
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
  }, [
    offset,
    onLoaded,
    onLoadingChange,
    refreshToken,
    reloadToken,
  ]);

  const rememberFocus = (trigger: HTMLElement) => {
    previousFocus.current = trigger;
  };

  const closeModal = () => {
    detailRequest.current += 1;
    setModal(null);
    queueMicrotask(() => {
      previousFocus.current?.focus();
      previousFocus.current = null;
    });
  };

  const openDetail = async (
    review: ReviewRequest,
    trigger: HTMLButtonElement,
  ) => {
    rememberFocus(trigger);
    const requestId = ++detailRequest.current;
    setModal({ kind: "loading" });
    try {
      const result = await request<ReviewRequest>(
        `/admin/audio_review/${review.id}`,
      );
      if (requestId === detailRequest.current) {
        setModal({ kind: "detail", review: result });
      }
    } catch (cause) {
      if (requestId === detailRequest.current) {
        setModal({ kind: "error", message: errorMessage(cause) });
      }
    }
  };

  const openAction = (
    kind: "approve" | "reject",
    review: ReviewRequest,
    trigger: HTMLButtonElement,
  ) => {
    rememberFocus(trigger);
    setModal({ kind, review });
  };

  const completeAction = (message: string) => {
    closeModal();
    showToast(message);
    setReloadToken((value) => value + 1);
    onChanged();
  };

  const approve = async (id: number, requiresCopyright: boolean) => {
    await request<ReviewRequest>(`/admin/audio_review/${id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ requiresCopyright }),
    });
    completeAction("审核已通过，作品现在已公开");
  };

  const reject = async (id: number, reason: string) => {
    await request<ReviewRequest>(`/admin/audio_review/${id}/reject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    completeAction("申请已拒绝，原因已记录");
  };

  return (
    <>
      {error ? (
        <section className="state-panel state-panel--error" role="alert">
          <span className="state-panel__icon">!</span>
          <div>
            <h2>审核队列加载失败</h2>
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

      {!error && !page ? <ReviewSkeleton /> : null}

      {page ? (
        <>
          <section
            className="dashboard-heading"
            aria-labelledby="review-title"
          >
            <div>
              <p className="section-kicker">内容治理</p>
              <h2 id="review-title">音频审核</h2>
              <p className="section-description">
                试听用户提交的实际片段，确认后再公开到音频市场。
              </p>
            </div>
            <span className="queue-summary">
              本页 {page.data.length} 条待处理
            </span>
          </section>

          {page.data.length === 0 ? (
            <section
              className="state-panel state-panel--empty"
              role="status"
            >
              <span className="state-panel__icon">✓</span>
              <div>
                <h2>待审核队列已清空</h2>
                <p>新的公开申请提交后会出现在这里。</p>
              </div>
            </section>
          ) : (
            <section className="review-list" aria-label="待审核音频列表">
              {page.data.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  onDetail={(trigger) =>
                    void openDetail(review, trigger)
                  }
                  onApprove={(trigger) =>
                    openAction("approve", review, trigger)
                  }
                  onReject={(trigger) =>
                    openAction("reject", review, trigger)
                  }
                />
              ))}
            </section>
          )}

          <ReviewPagination
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
        <ReviewDialog
          key={`${modal.kind}-${
            "review" in modal ? modal.review.id : "standalone"
          }`}
          state={modal}
          onClose={closeModal}
          onChooseApprove={(review) => setModal({ kind: "approve", review })}
          onChooseReject={(review) => setModal({ kind: "reject", review })}
          onApprove={approve}
          onReject={reject}
        />
      ) : null}
    </>
  );
}
