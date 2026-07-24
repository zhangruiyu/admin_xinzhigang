import './styles.css';

type User = {
  id: number;
  nickname: string;
  avatar?: string;
};

type AudioPack = {
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
  rejectReason?: string;
  clips?: AudioClip[];
};

type AudioClip = {
  id: number;
  fileUrl: string;
  durationMs: number;
  trimStartMs: number;
  trimEndMs?: number;
  sortIndex: number;
};

type ReviewRequest = {
  id: number;
  pack: AudioPack;
  status: string;
  rejectReason?: string;
  submittedAt: string;
  reviewedAt?: string;
};

type AdminLoginResponse = {
  admin: {
    id: number;
    username: string;
  };
  tokenName: string;
  tokenValue: string;
};

const API_BASE = normalizeApiBase(
  import.meta.env.VITE_GANGHUA_API_BASE_URL ?? 'http://127.0.0.1:8080',
);
const TOKEN_NAME_KEY = 'ganghua_admin_token_name';
const TOKEN_VALUE_KEY = 'ganghua_admin_token_value';
const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root not found');
}

app.innerHTML = `
  <main class="page">
    <header class="topbar">
      <div>
        <p class="eyebrow">钢化你的心</p>
        <h1>音频公开审核</h1>
      </div>
      <div class="toolbar">
        <button id="refresh" class="ghost">刷新</button>
        <button id="logout" class="ghost">退出</button>
      </div>
    </header>
    <section id="content" class="content"></section>
    <div id="modal-root"></div>
  </main>
`;

const content = document.querySelector<HTMLElement>('#content')!;
const modalRoot = document.querySelector<HTMLElement>('#modal-root')!;
document.querySelector<HTMLButtonElement>('#refresh')!.addEventListener('click', () => {
  void loadReviews();
});
document.querySelector<HTMLButtonElement>('#logout')!.addEventListener('click', () => {
  clearToken();
  renderLogin();
});

function hasToken() {
  return Boolean(localStorage.getItem(TOKEN_NAME_KEY) && localStorage.getItem(TOKEN_VALUE_KEY));
}

async function loadReviews() {
  if (!hasToken()) {
    renderLogin();
    return;
  }
  content.innerHTML = '<div class="state">加载中</div>';
  try {
    const body = await request(`${API_BASE}/admin/audio_review/pending`);
    const reviews = (body.data ?? []) as ReviewRequest[];
    renderReviews(reviews);
  } catch (error) {
    if (String(error).includes('未登录')) {
      clearToken();
      renderLogin('登录已失效，请重新登录');
      return;
    }
    content.innerHTML = `<div class="state error">后端暂不可用：${String(error)}</div>`;
  }
}

function renderLogin(message = '') {
  content.innerHTML = `
    <form id="login-form" class="login">
      <h2>后台登录</h2>
      ${message ? `<p class="error">${escapeHtml(message)}</p>` : ''}
      <label>
        账号
        <input id="username" value="admin" autocomplete="username" />
      </label>
      <label>
        密码
        <input id="password" type="password" value="ganghua-admin-dev" autocomplete="current-password" />
      </label>
      <button class="primary" type="submit">登录</button>
    </form>
  `;
  document.querySelector<HTMLFormElement>('#login-form')!.addEventListener('submit', (event) => {
    event.preventDefault();
    void login();
  });
}

async function login() {
  const username = document.querySelector<HTMLInputElement>('#username')!.value.trim();
  const password = document.querySelector<HTMLInputElement>('#password')!.value;
  try {
    const body = await request(`${API_BASE}/admin/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
      auth: false,
    });
    const login = body.data as AdminLoginResponse;
    localStorage.setItem(TOKEN_NAME_KEY, login.tokenName);
    localStorage.setItem(TOKEN_VALUE_KEY, login.tokenValue);
    await loadReviews();
  } catch (error) {
    renderLogin(String(error));
  }
}

function renderReviews(reviews: ReviewRequest[]) {
  if (reviews.length === 0) {
    content.innerHTML = '<div class="state">暂无待审核音频包</div>';
    return;
  }
  content.innerHTML = reviews.map(reviewCard).join('');
  for (const review of reviews) {
    document.querySelector<HTMLButtonElement>(`[data-approve="${review.id}"]`)?.addEventListener('click', () => {
      void approve(review.id);
    });
    document.querySelector<HTMLButtonElement>(`[data-reject="${review.id}"]`)?.addEventListener('click', () => {
      const reason = window.prompt('请输入拒绝原因');
      if (reason) {
        void reject(review.id, reason);
      }
    });
    document.querySelector<HTMLButtonElement>(`[data-detail="${review.id}"]`)?.addEventListener('click', () => {
      void openDetail(review.id);
    });
  }
}

function reviewCard(review: ReviewRequest) {
  return `
    <article class="card">
      <div class="watch">
        <div class="icon">♥</div>
      </div>
      <div class="meta">
        <h2>${escapeHtml(review.pack.title)}</h2>
        ${review.pack.description ? `<p>${escapeHtml(review.pack.description)}</p>` : ''}
        <p>${escapeHtml(review.pack.author.nickname)} · ${review.pack.playMode === 'RANDOM' ? '随机播放' : '顺序播放'}</p>
        <p>${new Date(review.submittedAt).toLocaleString('zh-CN')}</p>
      </div>
      <div class="actions">
        <button data-detail="${review.id}" class="ghost">详情</button>
        <button data-approve="${review.id}" class="primary">通过</button>
        <button data-reject="${review.id}" class="danger">拒绝</button>
      </div>
    </article>
  `;
}

async function openDetail(id: number) {
  modalRoot.innerHTML = '<div class="modal-backdrop"><section class="modal"><div class="state">加载中</div></section></div>';
  bindModalClose();
  try {
    const body = await request(`${API_BASE}/admin/audio_review/${id}`);
    renderDetail(body.data as ReviewRequest);
  } catch (error) {
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <section class="modal">
          <div class="modal-head">
            <h2>审核详情</h2>
            <button data-close-modal class="ghost">关闭</button>
          </div>
          <div class="state error">${escapeHtml(String(error))}</div>
        </section>
      </div>
    `;
    bindModalClose();
  }
}

function renderDetail(review: ReviewRequest) {
  const pack = review.pack;
  const clips = pack.clips ?? [];
  modalRoot.innerHTML = `
    <div class="modal-backdrop">
      <section class="modal">
        <div class="modal-head">
          <div>
            <p class="eyebrow">审核详情</p>
            <h2>${escapeHtml(pack.title)}</h2>
          </div>
          <button data-close-modal class="ghost">关闭</button>
        </div>
        <div class="detail-grid">
          <div class="watch large">
            ${pack.watchIconUrl ? `<img src="${assetUrl(pack.watchIconUrl)}" alt="" />` : '<div class="icon">♥</div>'}
          </div>
          <div class="detail-meta">
            <p><strong>作者</strong>${escapeHtml(pack.author.nickname)}</p>
            <p><strong>播放</strong>${pack.playMode === 'RANDOM' ? '随机播放' : '顺序播放'}</p>
            ${pack.description ? `<p><strong>介绍</strong>${escapeHtml(pack.description)}</p>` : ''}
            <p><strong>喜欢</strong>${pack.likeCount}</p>
            <p><strong>状态</strong>${escapeHtml(review.status)}</p>
            <p><strong>提交</strong>${new Date(review.submittedAt).toLocaleString('zh-CN')}</p>
            ${review.reviewedAt ? `<p><strong>审核</strong>${new Date(review.reviewedAt).toLocaleString('zh-CN')}</p>` : ''}
            ${review.rejectReason ? `<p><strong>拒绝原因</strong>${escapeHtml(review.rejectReason)}</p>` : ''}
          </div>
        </div>
        <h3>音频片段</h3>
        <div class="clip-list">
          ${
            clips.length === 0
              ? '<p class="muted">暂无片段</p>'
              : clips.map(clipRow).join('')
          }
        </div>
        <div class="actions modal-actions">
          <button data-approve="${review.id}" class="primary">通过</button>
          <button data-reject="${review.id}" class="danger">拒绝</button>
        </div>
      </section>
    </div>
  `;
  bindModalClose();
  modalRoot.querySelector<HTMLButtonElement>(`[data-approve="${review.id}"]`)?.addEventListener('click', async () => {
    await approve(review.id);
    closeModal();
  });
  modalRoot.querySelector<HTMLButtonElement>(`[data-reject="${review.id}"]`)?.addEventListener('click', async () => {
    const reason = window.prompt('请输入拒绝原因');
    if (reason) {
      await reject(review.id, reason);
      closeModal();
    }
  });
}

function clipRow(clip: AudioClip) {
  return `
    <article class="clip-row">
      <div>
        <h4>片段 ${clip.sortIndex + 1}</h4>
        <p>${escapeHtml(clip.fileUrl)}</p>
      </div>
      <span>${formatMs(clip.trimStartMs)} - ${clip.trimEndMs == null ? '末尾' : formatMs(clip.trimEndMs)}</span>
    </article>
  `;
}

async function approve(id: number) {
  await request(`${API_BASE}/admin/audio_review/${id}/approve`, { method: 'POST' });
  await loadReviews();
}

async function reject(id: number, reason: string) {
  await request(`${API_BASE}/admin/audio_review/${id}/reject`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  await loadReviews();
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function assetUrl(value: string) {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }
  return `${API_BASE}${value}`;
}

function normalizeApiBase(value: string) {
  const trimmed = value.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function formatMs(value: number) {
  return `${(value / 1000).toFixed(1)}s`;
}

function bindModalClose() {
  modalRoot.querySelector<HTMLButtonElement>('[data-close-modal]')?.addEventListener('click', closeModal);
  modalRoot.querySelector<HTMLElement>('.modal-backdrop')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  });
}

function closeModal() {
  modalRoot.innerHTML = '';
}

async function request(
  input: RequestInfo | URL,
  init: RequestInit & { auth?: boolean } = {},
): Promise<Record<string, unknown>> {
  const headers = new Headers(init.headers);
  if (init.auth !== false) {
    const tokenName = localStorage.getItem(TOKEN_NAME_KEY);
    const tokenValue = localStorage.getItem(TOKEN_VALUE_KEY);
    if (tokenName && tokenValue) {
      headers.set(tokenName, tokenValue);
    }
  }
  const response = await fetch(input, { ...init, headers });
  const body = (await response.json()) as Record<string, unknown>;
  if (body.code !== 200) {
    throw new Error(String(body.msg ?? '请求失败'));
  }
  return body;
}

function clearToken() {
  localStorage.removeItem(TOKEN_NAME_KEY);
  localStorage.removeItem(TOKEN_VALUE_KEY);
}

void loadReviews();
