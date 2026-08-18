# 网络监控

一个用于测试 Next.js + React + Vercel 的轻量示例项目。

## 功能

- 边缘节点状态面板
- 延迟、流量与负载模拟数据
- 5 秒自动刷新
- `/api/health` Edge Runtime 接口
- 响应式桌面 / 移动端布局
- 无额外 UI 依赖，部署简单

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开：`http://localhost:3000`

## 部署到 Vercel

### 方式一：Git

1. 把本项目提交到 GitHub / GitLab / Bitbucket。
2. 在 Vercel 中选择 **Add New Project**。
3. Import 对应仓库。
4. Vercel 会自动识别 Next.js，直接点击 Deploy。

### 方式二：Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

## 说明

当前节点与告警属于演示模拟数据；`/api/health` 是真实的 Next.js Route Handler，并配置为 Edge Runtime，用于验证 Vercel 上的动态请求能力。
