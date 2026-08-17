"use client";

import {
  type KeyboardEvent as ReactKeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import type { AudioPackReport } from "@/src/types";
import { errorMessage, formatDateTime } from "@/src/ui";

import { AudioRow, PackVisual } from "./review-parts";

export type ReportModalState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "detail"; report: AudioPackReport }
  | { kind: "delete"; report: AudioPackReport };

type ReportDialogProps = {
  state: ReportModalState;
  onClose: () => void;
  onChooseDelete: (report: AudioPackReport) => void;
  onDelete: (report: AudioPackReport) => Promise<void>;
};

export function ReportDialog({
  state,
  onClose,
  onChooseDelete,
  onDelete,
}: ReportDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
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

  const submitDelete = async () => {
    if (state.kind !== "delete") {
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      await onDelete(state.report);
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
        aria-labelledby="report-modal-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {state.kind === "loading" ? (
          <div className="modal-loading" aria-busy="true">
            <span className="loader" aria-hidden="true" />
            <h2 id="report-modal-title">正在加载投诉与音频包详情…</h2>
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
          <ReportDetail
            report={state.report}
            onClose={onClose}
            onDelete={() => onChooseDelete(state.report)}
          />
        ) : null}

        {state.kind === "delete" ? (
          <>
            <ModalHead
              kicker="删除作品"
              title="确认下架这个音频包？"
              onClose={busy ? undefined : onClose}
            />
            <div className="confirm-copy">
              <PackVisual
                value={state.report.pack.watchIconUrl}
                title={state.report.pack.title}
              />
              <div>
                <strong>{state.report.pack.title}</strong>
                <p>
                  删除后作品会立即从公开市场、收藏与详情页下架；投诉记录仍会保留供后续核查。
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
                className="button button--primary button--danger-solid"
                disabled={busy}
                aria-busy={busy}
                data-autofocus
                onClick={() => void submitDelete()}
              >
                {busy ? "处理中…" : "确认删除并下架"}
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function ModalHead({
  title,
  kicker = "投诉详情",
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
        <h2 id="report-modal-title">{title}</h2>
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

function ReportDetail({
  report,
  onClose,
  onDelete,
}: {
  report: AudioPackReport;
  onClose: () => void;
  onDelete: () => void;
}) {
  const pack = report.pack;
  const clips = pack.clips ?? [];
  return (
    <>
      <ModalHead title={pack.title} onClose={onClose} />

      <section className="report-summary">
        <div className="report-summary__heading">
          <span className="status-pill">{report.reason}</span>
          <time dateTime={report.createdAt}>
            {formatDateTime(report.createdAt)}
          </time>
        </div>
        <p>{report.description || "用户未填写补充内容"}</p>
        <div className="review-meta">
          <span>举报记录 ID：{report.id}</span>
          <span>举报用户 ID：{report.userId}</span>
          <span>音频包 ID：{report.packId}</span>
        </div>
      </section>

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
            <dt>作者 ID</dt>
            <dd>{pack.author.id}</dd>
          </div>
          <div>
            <dt>作品状态</dt>
            <dd>{report.packDeleted ? "已删除下架" : "公开中"}</dd>
          </div>
          <div>
            <dt>播放方式</dt>
            <dd>{pack.playMode === "RANDOM" ? "随机播放" : "顺序播放"}</dd>
          </div>
          <div>
            <dt>喜欢人数</dt>
            <dd>{pack.likeCount}</dd>
          </div>
          <div>
            <dt>音频片段</dt>
            <dd>{clips.length} 段</dd>
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
            <div className="empty-compact">该作品没有可试听的音频片段</div>
          ) : (
            clips.map((clip, index) => (
              <AudioRow clip={clip} index={index} key={clip.id} />
            ))
          )}
        </div>
      </section>

      <div className="modal-actions">
        <button className="button button--secondary" onClick={onClose}>
          关闭
        </button>
        <button
          className="button button--primary button--danger-solid"
          disabled={report.packDeleted}
          onClick={onDelete}
        >
          {report.packDeleted ? "作品已下架" : "删除并下架作品"}
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
      'button:not([disabled]), audio[controls], [tabindex]:not([tabindex="-1"])',
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
