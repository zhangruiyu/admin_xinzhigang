import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBackendUrl,
  resolveBackendBaseUrl,
} from "./backend-proxy.mjs";

test("uses the local backend during development", () => {
  assert.equal(
    resolveBackendBaseUrl(undefined, "development"),
    "http://127.0.0.1:8080",
  );
});

test("uses the production backend from the Vercel server", () => {
  assert.equal(
    resolveBackendBaseUrl(undefined, "production"),
    "http://api.gagagugu.cn/app/api",
  );
});

test("builds an encoded fixed-origin upstream URL", () => {
  const url = buildBackendUrl(
    ["admin", "dashboard", "stats"],
    "?days=30",
    "http://api.gagagugu.cn/app/api",
  );

  assert.equal(
    url.toString(),
    "http://api.gagagugu.cn/app/api/admin/dashboard/stats?days=30",
  );
});

test("rejects non-HTTP backend protocols", () => {
  assert.throws(
    () => resolveBackendBaseUrl("file:///etc/passwd", "production"),
    /只支持 HTTP\(S\)/,
  );
});
