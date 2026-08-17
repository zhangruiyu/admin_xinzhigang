import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "钢化你的心运营后台",
  description: "钢化你的心数据概览、音频审核与用户投诉后台",
};

export const viewport: Viewport = {
  themeColor: "#fbf8f7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
