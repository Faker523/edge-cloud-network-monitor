'use client';

import { useEffect, useMemo, useState } from 'react';

const initialNodes = [
  { city: '台北', region: 'TW-TPE', latency: 12, traffic: 74, status: '正常' },
  { city: '东京', region: 'JP-NRT', latency: 31, traffic: 61, status: '正常' },
  { city: '新加坡', region: 'SG-SIN', latency: 48, traffic: 83, status: '繁忙' },
  { city: '香港', region: 'HK-HKG', latency: 22, traffic: 69, status: '正常' },
  { city: '法兰克福', region: 'DE-FRA', latency: 176, traffic: 45, status: '正常' },
  { city: '洛杉矶', region: 'US-LAX', latency: 138, traffic: 57, status: '正常' },
];

const alerts = [
  { level: 'warning', title: 'SG-SIN 流量偏高', time: '2 分钟前' },
  { level: 'info', title: '全局配置已同步', time: '12 分钟前' },
  { level: 'success', title: 'US-LAX 节点恢复正常', time: '28 分钟前' },
];

function jitter(value, amount = 3) {
  return Math.max(1, value + Math.floor(Math.random() * (amount * 2 + 1)) - amount);
}

export default function Home() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edgeApi, setEdgeApi] = useState({ status: '检测中', region: '—', updatedAt: null });
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        const data = await res.json();
        setEdgeApi({
          status: data.ok ? '已连接' : '异常',
          region: data.region || 'Vercel Edge',
          updatedAt: data.timestamp,
        });
      } catch {
        setEdgeApi({ status: '连接失败', region: '—', updatedAt: null });
      }

      setNodes((current) =>
        current.map((node) => ({
          ...node,
          latency: jitter(node.latency, 4),
          traffic: Math.min(96, jitter(node.traffic, 4)),
        }))
      );
      setLastUpdated(new Date());
    };

    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const avgLatency = Math.round(nodes.reduce((sum, node) => sum + node.latency, 0) / nodes.length);
    const avgTraffic = Math.round(nodes.reduce((sum, node) => sum + node.traffic, 0) / nodes.length);
    const healthy = nodes.filter((node) => node.status === '正常').length;
    return { avgLatency, avgTraffic, healthy };
  }, [nodes]);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">EDGE CLOUD / NETWORK OBSERVABILITY</div>
          <h1>CHATGPT的网络监控</h1>
          <p className="subtitle">实时查看边缘节点状态、网络延迟、流量与告警信息。</p>
        </div>
        <div className="liveBadge"><span className="pulse" /> LIVE</div>
      </header>

      <section className="summaryGrid">
        <article className="metricCard">
          <span>在线节点</span>
          <strong>{stats.healthy}/{nodes.length}</strong>
          <small>全球边缘节点</small>
        </article>
        <article className="metricCard">
          <span>平均延迟</span>
          <strong>{stats.avgLatency}<em> ms</em></strong>
          <small>过去 5 秒模拟值</small>
        </article>
        <article className="metricCard">
          <span>平均负载</span>
          <strong>{stats.avgTraffic}<em>%</em></strong>
          <small>节点带宽使用率</small>
        </article>
        <article className="metricCard accent">
          <span>Edge API</span>
          <strong className="apiStatus">{edgeApi.status}</strong>
          <small>{edgeApi.region}</small>
        </article>
      </section>

      <section className="contentGrid">
        <article className="panel nodePanel">
          <div className="panelHeader">
            <div>
              <span className="sectionLabel">GLOBAL NODES</span>
              <h2>边缘节点状态</h2>
            </div>
            <span className="updated">更新于 {lastUpdated.toLocaleTimeString('zh-CN', { hour12: false })}</span>
          </div>

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>节点</th>
                  <th>状态</th>
                  <th>延迟</th>
                  <th>流量</th>
                  <th>负载</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr key={node.region}>
                    <td>
                      <div className="nodeName">{node.city}</div>
                      <div className="nodeRegion">{node.region}</div>
                    </td>
                    <td><span className={`status ${node.status === '正常' ? 'ok' : 'busy'}`}>{node.status}</span></td>
                    <td className="mono">{node.latency} ms</td>
                    <td className="mono">{node.traffic}%</td>
                    <td>
                      <div className="bar"><span style={{ width: `${node.traffic}%` }} /></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="sideColumn">
          <article className="panel signalPanel">
            <span className="sectionLabel">EDGE FUNCTION</span>
            <h2>边缘请求检测</h2>
            <div className="signalGraphic">
              <div className="orbit orbitOne" />
              <div className="orbit orbitTwo" />
              <div className="core"><span /></div>
            </div>
            <div className="signalRows">
              <div><span>连接状态</span><b>{edgeApi.status}</b></div>
              <div><span>运行区域</span><b>{edgeApi.region}</b></div>
              <div><span>刷新频率</span><b>5 秒</b></div>
            </div>
          </article>

          <article className="panel alertsPanel">
            <div className="panelHeader compact">
              <div>
                <span className="sectionLabel">EVENTS</span>
                <h2>最近告警</h2>
              </div>
              <span className="count">3</span>
            </div>
            <div className="alerts">
              {alerts.map((alert) => (
                <div className="alertItem" key={alert.title}>
                  <span className={`alertDot ${alert.level}`} />
                  <div><b>{alert.title}</b><small>{alert.time}</small></div>
                </div>
              ))}
            </div>
          </article>
        </aside>
      </section>

      <footer>
        <span>Demo Dashboard · Next.js + React</span>
        <span>适用于 Vercel 部署测试</span>
      </footer>
    </main>
  );
}
