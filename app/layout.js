import './globals.css';

export const metadata = {
  title: '边缘云网络监控',
  description: '一个用于测试 Next.js 与 Vercel 部署能力的轻量网络监控面板',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
