import "tdesign-react/es/style/index.css";
import type { Metadata } from "next";
import { TDesignProvider } from "@/components/TDesignProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeLog · 博客后台",
  description: "个人技术分享博客内容管理后台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log(`[layout] 渲染根布局 | 时间=${new Date().toISOString()}`);
  return (
    <html lang="zh-CN" className="h-full">
      <body className="h-full bg-zinc-50">
        <TDesignProvider>{children}</TDesignProvider>
      </body>
    </html>
  );
}
