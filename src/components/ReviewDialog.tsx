"use client";

import {
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type { ReviewRequest } from "@/src/types";
import { errorMessage, formatDateTime } from "@/src/ui";

import { AudioRow, PackVisual } from "./review-parts";

export type ReviewModalState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "detail"; review: ReviewRequest }
  | { kind: "approve"; review: ReviewRequest }
  | { kind: "reject"; review: ReviewRequest };

type ReviewDialogProps = {
  state: ReviewModalState;
  onClose: () => void;
  onChooseApprove: (review: ReviewRequest) => void;
  onChooseReject: (review: ReviewRequest) => void;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number, reason: string) => Promise<void>;
};

export function ReviewDialog({
  state,
  onClose,
  onChooseApprove,
  onChooseReject,
  onApprove,
  onReject,
}: ReviewDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const root = dialogRef.current;
      const target =
        root?.querySelector<HTMLElement>("[data-autofocus]") ?? root;
      target?.focus();
    });
  }, [state]);

  useEffect(
    () => () => {
      dialogRef.current
        ?.querySelectorAll<HTMLAudioElement>("audio")
        .forEach((audio) => audio.pause());
    },
    [],
  );

  const submitApprove = async () => {
    if (state.kind !== "approve") {
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await onApprove(state.review.id);
    } catch (cause) {
      setBusy(false);
      setFormError(errorMessage(cause));
    }
  };

  const submitReject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state.kind !== "reject") {
      return;
    }
    const value = reason.trim();
    if (!value) {
      setFormError("请输入拒绝原因");
      dialogRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await onReject(state.review.id, value);
    } catch (cause) {
      setBusy(false);
      setFormError(errorMessage(cause));
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape" && !busy) {
      onClose();
      return;
    }
    if (event.key === "Tab") {
      trapModalFocus(event.currentTarget, event);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {state.kind === "loading" ? (
          <div className="modal-loading" aria-busy="true">
            <span className="loader" aria-hidden="true" />
            <h2 id="modal-title">正在加载审核详情…</h2>
          </div>
        ) : null}

        {state.kind === "error" ? (
          <>
            <ModalHead title="加载失败" onClose={onClose} />
            <div className="state-panel state-panel--error" role="alert">
              <span className="state-panel__icon">!</span>
              <div>
                <p>{state.message}</p>
              </div>
            </div>
          </>
        ) : null}

        {state.kind === "detail" ? (
          <ReviewDetail
            review={state.review}
            onClose={onClose}
            onApprove={() => onChooseApprove(state.review)}
            onReject={() => onChooseReject(state.review)}
          />
        ) : null}

        {state.kind === "approve" ? (
          <>
            <ModalHead
              kicker="确认操作"
              title="通过这条音频申请？"
              onClose={busy ? undefined : onClose}
            />
            <div className="confirm-copy">
              <PackVisual
                value={state.review.pack.watchIconUrl}
                title={state.review.pack.title}
              />
              <div>
                <strong>{state.review.pack.title}</strong>
                <p>
                  通过后作品会立即公开到音频市场，其他用户即可查看和使用。
                </p>
              </div>
            </div>
            <p className="form-error" role="alert">
              {formError}
            </p>
            <div className="modal-actions">
              <button
                className="button button--secondary"
                disabled={busy}
                onClick={onClose}
              >
                取消
              </button>
              <button
                className="button button--primary"
                disabled={busy}
                aria-busy={busy}
                data-autofocus
                onClick={() => void submitApprove()}
              >
                {busy ? "处理中…" : "确认通过"}
              </button>
            </div>
          </>
        ) : null}

        {state.kind === "reject" ? (
          <>
            <ModalHead
              kicker="拒绝申请"
              title={state.review.pack.title}
              onClose={busy ? undefined : onClose}
            />
            <form className="reject-form" onSubmit={submitReject}>
              <label htmlFor="reject-reason">拒绝原因</label>
              <textarea
                id="reject-reason"
                name="reason"
                maxLength={500}
                rows={5}
                aria-required="true"
                data-autofocus
                disabled={busy}
                value={reason}
                placeholder="请说明需要修改的具体内容，用户会看到这段说明。"
                onChange={(event) => {
                  setReason(event.target.value);
                  if (formError) {
                    setFormError("");
                  }
                }}
              />
              <div className="field-footer">
                <span>不能为空，最多 500 字</span>
                <span>{reason.length} / 500</span>
              </div>
              <p className="form-error" role="alert">
                {formError}
              </p>
              <div className="modal-actions">
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={busy}
                  onClick={onClose}
                >
                  取消
                </button>
                <button
                  className="button button--primary button--danger-solid"
                  type="submit"
                  disabled={busy}
                  aria-busy={busy}
                >
                  {busy ? "处理中…" : "确认拒绝"}
                </button>
              </div>
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}

function ModalHead({
  title,
  kicker = "审核详情",
  onClose,
}: {
  title: string;
  kicker?: string;
  onClose?: () => void;
}) {
  return (
    <div className="modal-head">
      <div>
        <p className="section-kicker">{kicker}</p>
        <h2 id="modal-title">{title}</h2>
      </div>
      <button
        className="icon-button"
        disabled={!onClose}
        aria-label="关闭窗口"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}

function ReviewDetail({
  review,
  onClose,
  onApprove,
  onReject,
}: {
  review: ReviewRequest;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const pack = review.pack;
  const clips = pack.clips ?? [];
  return (
    <>
      <ModalHead title={pack.title} onClose={onClose} />
      <div className="review-detail">
        <div className="review-detail__visual">
          <PackVisual value={pack.watchIconUrl} title={pack.title} large />
        </div>
        <dl className="detail-list">
          <div>
            <dt>作者</dt>
            <dd>{pack.author.nickname}</dd>
          </div>
          <div>
            <dt>播放方式</dt>
            <dd>{pack.playMode === "RANDOM" ? "随机播放" : "顺序播放"}</dd>
          </div>
          <div>
            <dt>提交时间</dt>
            <dd>{formatDateTime(review.submittedAt)}</dd>
          </div>
          <div>
            <dt>喜欢人数</dt>
            <dd>{pack.likeCount}</dd>
          </div>
        </dl>
      </div>

      {pack.description ? (
        <section className="detail-section">
          <h3>作品介绍</h3>
          <p>{pack.description}</p>
        </section>
      ) : null}

      {(pack.tags?.length ?? 0) > 0 ? (
        <section className="detail-section">
          <h3>内容标签</h3>
          <div className="tag-list">
            {pack.tags?.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </section>
      ) : null}

      <section className="detail-section">
        <div className="detail-section__heading">
          <h3>音频片段</h3>
          <span>{clips.length} 段</span>
        </div>
        <div className="audio-list">
          {clips.length === 0 ? (
            <div className="empty-compact">该申请没有可试听的音频片段</div>
          ) : (
            clips.map((clip, index) => (
              <AudioRow clip={clip} index={index} key={clip.id} />
            ))
          )}
        </div>
      </section>

      <div className="modal-actions">
        <button
          className="button button--secondary button--danger"
          onClick={onReject}
        >
          拒绝申请
        </button>
        <button className="button button--primary" onClick={onApprove}>
          确认通过
        </button>
      </div>
    </>
  );
}

function trapModalFocus(
  root: HTMLElement,
  event: ReactKeyboardEvent<HTMLElement>,
) {
  const focusable = Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled]), audio[controls], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element.offsetParent !== null);
  if (focusable.length === 0) {
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
