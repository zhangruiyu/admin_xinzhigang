import type { NextRequest } from "next/server";

import {
  buildBackendUrl,
  resolveBackendBaseUrl,
} from "@/src/server/backend-proxy.mjs";

const requestHeaderNames = [
  "accept",
  "authorization",
  "content-type",
  "if-modified-since",
  "if-none-match",
  "range",
  "satoken",
] as const;

const responseHeaderNames = [
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
  "satoken",
] as const;

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  try {
    const { path } = await context.params;
    const target = buildBackendUrl(
      path,
      request.nextUrl.search,
      resolveBackendBaseUrl(),
    );
    const headers = pickHeaders(request.headers, requestHeaderNames);
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: pickHeaders(upstream.headers, responseHeaderNames),
    });
  } catch (cause) {
    console.error("Backend proxy request failed", cause);
    return Response.json(
      {
        code: 502,
        msg: "后端服务暂时不可用，请稍后重试",
        data: null,
      },
      { status: 502 },
    );
  }
}

function pickHeaders(
  source: Headers,
  names: readonly string[],
): Headers {
  const result = new Headers();
  for (const name of names) {
    const value = source.get(name);
    if (value) {
      result.set(name, value);
    }
  }
  return result;
}

export const dynamic = "force-dynamic";

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS",
    },
  });
}
