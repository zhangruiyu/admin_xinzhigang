const API_BASE = normalizeApiBase(
  process.env.NEXT_PUBLIC_GANGHUA_API_BASE_URL ?? 'http://127.0.0.1:8080',
);

type ApiResponse<T> = {
  code: number;
  msg?: string;
  data: T;
};

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  let body: ApiResponse<T>;
  try {
    body = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error(`服务器返回了无法识别的响应（HTTP ${response.status}）`);
  }
  if (!response.ok || body.code !== 200) {
    throw new Error(body.msg || `请求失败（HTTP ${response.status}）`);
  }
  return body.data;
}

export function assetUrl(value?: string): string {
  const source = value?.trim();
  if (!source) {
    return '';
  }
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return source;
  }
  if (!source.startsWith('/')) {
    return '';
  }
  return `${API_BASE}${source}`;
}

function normalizeApiBase(value: string): string {
  const trimmed = value.trim();
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}
