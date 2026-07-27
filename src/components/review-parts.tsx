/* eslint-disable @next/next/no-img-element */

import { useRef } from "react";

import { assetUrl } from "@/src/api";
import type { AudioClip, PageData, ReviewRequest } from "@/src/types";
import { formatDateTime, formatMs } from "@/src/ui";

type ReviewCardProps = {
  review: ReviewRequest;
  onDetail: (trigger: HTMLButtonElement) => void;
  onApprove: (trigger: HTMLButtonElement) => void;
  onReject: (trigger: HTMLButtonElement) => void;
};

export function ReviewCard({
  review,
  onDetail,
  onApprove,
  onReject,
}: ReviewCardProps) {
  const pack = review.pack;
  return (
    <article className="review-card">
      <PackVisual value={pack.watchIconUrl} title={pack.title} />
      <div className="review-card__body">
        <div className="review-card__title-row">
          <div>
            <span className="status-pill">待审核</span>
            <h3>{pack.title}</h3>
          </div>
          <time dateTime={review.submittedAt}>
            {formatDateTime(review.submittedAt)}
          </time>
        </div>
        <p className="review-card__description">
          {pack.description || "用户未填写作品介绍"}
        </p>
        <div className="review-meta">
          <span>作者：{pack.author.nickname}</span>
          <span>{pack.clips?.length ?? 0} 段音频</span>
          <span>{pack.playMode === "RANDOM" ? "随机播放" : "顺序播放"}</span>
        </div>
      </div>
      <div className="review-card__actions">
        <button
          className="button button--quiet"
          onClick={(event) => onDetail(event.currentTarget)}
        >
          查看并试听
        </button>
        <button
          className="button button--secondary button--danger"
          onClick={(event) => onReject(event.currentTarget)}
        >
          拒绝
        </button>
        <button
          className="button button--primary"
          onClick={(event) => onApprove(event.currentTarget)}
        >
          通过
        </button>
      </div>
    </article>
  );
}

export function PackVisual({
  value,
  title,
  large = false,
}: {
  value?: string;
  title: string;
  large?: boolean;
}) {
  const image = assetUrl(value);
  return (
    <div className={`pack-visual${large ? " pack-visual--large" : ""}`}>
      {image ? (
        <img src={image} alt={`${title}的手表图标`} />
      ) : (
        <span aria-hidden="true">♥</span>
      )}
    </div>
  );
}

export function AudioRow({
  clip,
  index,
}: {
  clip: AudioClip;
  index: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const source = assetUrl(clip.fileUrl);
  const start = clip.trimStartMs / 1000;
  const endMs = clip.trimEndMs ?? clip.durationMs;
  const end = endMs > 0 ? endMs / 1000 : undefined;

  const resetIfOutsideTrim = (audio: HTMLAudioElement) => {
    if (
      audio.currentTime < start ||
      (end !== undefined && audio.currentTime >= end)
    ) {
      audio.currentTime = start;
    }
  };

  return (
    <article className="audio-row">
      <div className="audio-row__head">
        <div>
          <span>片段 {index + 1}</span>
          <h4>{clip.displayName || `音频片段 ${index + 1}`}</h4>
        </div>
        <small>
          {formatMs(clip.trimStartMs)} –{" "}
          {clip.trimEndMs == null ? "音频末尾" : formatMs(clip.trimEndMs)}
        </small>
      </div>
      {source ? (
        <audio
          ref={audioRef}
          controls
          preload="metadata"
          src={source}
          onLoadedMetadata={(event) => {
            const audio = event.currentTarget;
            if (Number.isFinite(start) && start > 0 && start < audio.duration) {
              audio.currentTime = start;
            }
          }}
          onPlay={(event) => {
            const audio = event.currentTarget;
            document.querySelectorAll<HTMLAudioElement>("audio").forEach(
              (other) => {
                if (other !== audio) {
                  other.pause();
                }
              },
            );
            resetIfOutsideTrim(audio);
          }}
          onTimeUpdate={(event) => {
            const audio = event.currentTarget;
            if (end !== undefined && audio.currentTime >= end) {
              audio.pause();
              audio.currentTime = start;
            }
          }}
        />
      ) : (
        <p className="audio-error">音频地址不可用，无法试听</p>
      )}
    </article>
  );
}

export function ReviewPagination({
  page,
  onPrevious,
  onNext,
}: {
  page: PageData<ReviewRequest>;
  onPrevious: () => void;
  onNext: () => void;
}) {
  if (page.offset === 0 && !page.hasMore) {
    return null;
  }
  const pageNumber = Math.floor(page.offset / page.limit) + 1;
  return (
    <nav className="pagination" aria-label="审核列表分页">
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

export function ReviewSkeleton() {
  return (
    <>
      <section
        className="dashboard-heading skeleton-heading"
        aria-busy="true"
        aria-label="正在加载审核队列"
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
