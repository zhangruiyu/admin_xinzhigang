export type User = {
  id: number;
  nickname: string;
  avatar?: string;
};

export type AudioClip = {
  id: number;
  fileUrl: string;
  displayName: string;
  durationMs: number;
  trimStartMs: number;
  trimEndMs?: number;
  sortIndex: number;
};

export type AudioPack = {
  id: number;
  title: string;
  description?: string;
  coverImageUrl?: string;
  watchIconUrl?: string;
  playMode: string;
  visibility?: string;
  reviewStatus?: string;
  likeCount: number;
  author: User;
  tags?: string[];
  rejectReason?: string;
  clips?: AudioClip[];
};

export type ReviewRequest = {
  id: number;
  pack: AudioPack;
  status: string;
  rejectReason?: string;
  submittedAt: string;
  reviewedAt?: string;
};

export type AudioPackReport = {
  id: number;
  packId: number;
  userId: number;
  reason: string;
  description?: string | null;
  createdAt: string;
  packDeleted: boolean;
  pack: AudioPack;
};

export type PageData<T> = {
  data: T[];
  offset: number;
  limit: number;
  hasMore: boolean;
};

export type DashboardStats = {
  timeZone: string;
  range: {
    startDate: string;
    endDate: string;
    days: number;
  };
  totalUsers: number;
  todayRegistrations: number;
  pendingReviewCount: number;
  dailyRegistrations: Array<{
    date: string;
    count: number;
  }>;
  channelRegistrations: Array<{
    channel: string;
    count: number;
  }>;
};
