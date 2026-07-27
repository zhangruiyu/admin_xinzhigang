const API_BASE = "/api/backend";

type ApiResponse<T> = {
  code: number;
  msg?: string;
  data: T;
};

export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause;
    }
    throw new Error("无法连接服务端，请检查网络后重试");
  }

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
    const proxied = proxyKnownBackendAsset(source);
    if (proxied) {
      return proxied;
    }
    return source;
  }
  if (!source.startsWith('/')) {
    return '';
  }
  return `${API_BASE}${source}`;
}

function proxyKnownBackendAsset(source: string): string | null {
  try {
    const url = new URL(source);
    if (url.hostname !== "api.gagagugu.cn") {
      return null;
    }

    const apiPrefix = "/app/api";
    const path = url.pathname.startsWith(`${apiPrefix}/`)
      ? url.pathname.slice(apiPrefix.length)
      : url.pathname;
    return `${API_BASE}${path}${url.search}`;
  } catch {
    return null;
  }
}
