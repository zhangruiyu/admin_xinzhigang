const DEFAULT_LOCAL_BACKEND = "http://127.0.0.1:8080";
const DEFAULT_PRODUCTION_BACKEND = "http://api.gagagugu.cn/app/api";

/**
 * @param {string | undefined} configuredValue
 * @param {string | undefined} nodeEnv
 */
export function resolveBackendBaseUrl(
  configuredValue = process.env.GANGHUA_API_BASE_URL,
  nodeEnv = process.env.NODE_ENV,
) {
  const fallback =
    nodeEnv === "production"
      ? DEFAULT_PRODUCTION_BACKEND
      : DEFAULT_LOCAL_BACKEND;
  const candidate = (configuredValue ?? fallback).trim();

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("GANGHUA_API_BASE_URL 必须是有效的 HTTP(S) 地址");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("GANGHUA_API_BASE_URL 只支持 HTTP(S) 地址");
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

/**
 * @param {string[]} pathSegments
 * @param {string} search
 * @param {string} backendBaseUrl
 */
export function buildBackendUrl(
  pathSegments,
  search,
  backendBaseUrl = resolveBackendBaseUrl(),
) {
  const encodedPath = pathSegments.map(encodeURIComponent).join("/");
  const target = new URL(`${backendBaseUrl}/${encodedPath}`);
  target.search = search;
  return target;
}
