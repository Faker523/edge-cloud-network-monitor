import './globals.css';

export const metadata = {
  title: 'Cube 网络指标监控',
  description: '容器与虚拟机的实时网络吞吐、数据包、错误及丢包监控面板',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
