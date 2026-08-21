'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

const MIB = 1024 * 1024;
const REFRESH_INTERVAL = 3000;

const initialResources = [
  {
    id: 'container-gateway', name: 'edge-gateway', detail: 'production / gateway',
    type: 'container', host: 'worker-tpe-01', interfaceName: 'eth0', status: '告警',
    rxRate: 18.6, txRate: 7.4, rxPps: 5120, txPps: 2480,
    rxBytes: 92845678124, txBytes: 36718450122, rxPackets: 82645410, txPackets: 39183204,
    rxErrors: 83, txErrors: 12, rxDropped: 416, txDropped: 38,
  },
  {
    id: 'container-api', name: 'order-api-7db9c', detail: 'production / order',
    type: 'container', host: 'worker-tpe-02', interfaceName: 'eth0', status: '健康',
    rxRate: 12.8, txRate: 9.6, rxPps: 3840, txPps: 3210,
    rxBytes: 68128459120, txBytes: 51772234091, rxPackets: 52819664, txPackets: 44670128,
    rxErrors: 2, txErrors: 0, rxDropped: 5, txDropped: 1,
  },
  {
    id: 'container-worker', name: 'billing-worker-5f2a', detail: 'production / billing',
    type: 'container', host: 'worker-hkg-01', interfaceName: 'eth0', status: '健康',
    rxRate: 4.2, txRate: 2.8, rxPps: 1260, txPps: 890,
    rxBytes: 23772234664, txBytes: 14890321554, rxPackets: 19383212, txPackets: 12374904,
    rxErrors: 0, txErrors: 1, rxDropped: 2, txDropped: 0,
  },
  {
    id: 'container-cache', name: 'redis-cache-0', detail: 'production / cache',
    type: 'container', host: 'worker-hkg-02', interfaceName: 'eth0', status: '健康',
    rxRate: 7.1, txRate: 6.7, rxPps: 2210, txPps: 2090,
    rxBytes: 44341890021, txBytes: 41992814033, rxPackets: 38919205, txPackets: 37428784,
    rxErrors: 0, txErrors: 0, rxDropped: 1, txDropped: 0,
  },
  {
    id: 'vm-web', name: 'prod-web-01', detail: 'ubuntu 24.04 / web',
    type: 'vm', host: 'cluster-tpe-a', interfaceName: 'ens192', status: '健康',
    rxRate: 24.3, txRate: 16.1, rxPps: 6920, txPps: 4810,
    rxBytes: 324781249055, txBytes: 209847281901, rxPackets: 281927401, txPackets: 176834920,
    rxErrors: 4, txErrors: 1, rxDropped: 12, txDropped: 3,
  },
  {
    id: 'vm-analytics', name: 'analytics-vm-02', detail: 'rocky 9 / analytics',
    type: 'vm', host: 'cluster-sin-b', interfaceName: 'ens160', status: '健康',
    rxRate: 9.8, txRate: 3.5, rxPps: 2980, txPps: 1180,
    rxBytes: 187219036822, txBytes: 72844193004, rxPackets: 148201774, txPackets: 63128190,
    rxErrors: 1, txErrors: 0, rxDropped: 8, txDropped: 1,
  },
];

const metricDefinitions = [
  { key: 'network_receive_bytes_total', label: '接收字节总量', field: 'rxBytes', rateField: 'rxRate', kind: 'bytes', direction: 'receive' },
  { key: 'network_transmit_bytes_total', label: '发送字节总量', field: 'txBytes', rateField: 'txRate', kind: 'bytes', direction: 'transmit' },
  { key: 'network_receive_packets_total', label: '接收数据包总量', field: 'rxPackets', rateField: 'rxPps', kind: 'packets', direction: 'receive' },
  { key: 'network_transmit_packets_total', label: '发送数据包总量', field: 'txPackets', rateField: 'txPps', kind: 'packets', direction: 'transmit' },
  { key: 'network_receive_errors_total', label: '接收错误总量', field: 'rxErrors', kind: 'counter', direction: 'receive' },
  { key: 'network_transmit_errors_total', label: '发送错误总量', field: 'txErrors', kind: 'counter', direction: 'transmit' },
  { key: 'network_receive_dropped_total', label: '接收丢包总量', field: 'rxDropped', kind: 'counter', direction: 'receive' },
  { key: 'network_transmit_dropped_total', label: '发送丢包总量', field: 'txDropped', kind: 'counter', direction: 'transmit' },
];

const scopes = [
  { id: 'all', label: '全部资源' },
  { id: 'container', label: '容器' },
  { id: 'vm', label: '虚拟机' },
];

function getScopedResources(resources, scope) {
  return scope === 'all' ? resources : resources.filter((resource) => resource.type === scope);
}

function aggregate(resources) {
  return resources.reduce(
    (total, resource) => {
      metricDefinitions.forEach((metric) => {
        total[metric.field] += resource[metric.field];
      });
      total.rxRate += resource.rxRate;
      total.txRate += resource.txRate;
      total.rxPps += resource.rxPps;
      total.txPps += resource.txPps;
      return total;
    },
    {
      rxBytes: 0, txBytes: 0, rxPackets: 0, txPackets: 0,
      rxErrors: 0, txErrors: 0, rxDropped: 0, txDropped: 0,
      rxRate: 0, txRate: 0, rxPps: 0, txPps: 0,
    }
  );
}

function makeInitialHistory(resources) {
  const total = aggregate(resources);
  return Array.from({ length: 36 }, (_, index) => {
    const receiveWave = Math.sin(index * 0.46) * 0.12 + Math.cos(index * 0.18) * 0.06;
    const transmitWave = Math.cos(index * 0.4) * 0.1 + Math.sin(index * 0.21) * 0.05;
    return {
      rx: Math.max(0.1, total.rxRate * (0.91 + receiveWave)),
      tx: Math.max(0.1, total.txRate * (0.93 + transmitWave)),
    };
  });
}

const initialHistories = {
  all: makeInitialHistory(initialResources),
  container: makeInitialHistory(getScopedResources(initialResources, 'container')),
  vm: makeInitialHistory(getScopedResources(initialResources, 'vm')),
};

function formatBytes(value) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let current = value;
  let unitIndex = 0;
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }
  const digits = current >= 100 ? 0 : current >= 10 ? 1 : 2;
  return current.toFixed(digits) + ' ' + units[unitIndex];
}

function formatCount(value) {
  return new Intl.NumberFormat('zh-CN', {
    notation: value >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(Math.round(value));
}

function formatRate(value) {
  return value.toFixed(value >= 10 ? 1 : 2) + ' MiB/s';
}

function formatPps(value) {
  return formatCount(value) + ' pps';
}

function randomize(value, ratio = 0.12) {
  const change = 1 + (Math.random() * ratio * 2 - ratio);
  return Math.max(0.05, value * change);
}

function advanceResource(resource) {
  const seconds = REFRESH_INTERVAL / 1000;
  const rxRate = randomize(resource.rxRate);
  const txRate = randomize(resource.txRate);
  const rxPps = randomize(resource.rxPps, 0.1);
  const txPps = randomize(resource.txPps, 0.1);
  const noisyInterface = resource.id === 'container-gateway';

  return {
    ...resource,
    rxRate, txRate, rxPps, txPps,
    rxBytes: resource.rxBytes + rxRate * MIB * seconds,
    txBytes: resource.txBytes + txRate * MIB * seconds,
    rxPackets: resource.rxPackets + rxPps * seconds,
    txPackets: resource.txPackets + txPps * seconds,
    rxErrors: resource.rxErrors + (noisyInterface && Math.random() > 0.56 ? 1 : 0),
    txErrors: resource.txErrors + (noisyInterface && Math.random() > 0.82 ? 1 : 0),
    rxDropped: resource.rxDropped + (noisyInterface ? Math.floor(Math.random() * 4) : 0),
    txDropped: resource.txDropped + (noisyInterface && Math.random() > 0.7 ? 1 : 0),
  };
}

function metricValue(metric, stats) {
  return metric.kind === 'bytes' ? formatBytes(stats[metric.field]) : formatCount(stats[metric.field]);
}

function metricDetail(metric, stats) {
  if (metric.kind === 'bytes') return formatRate(stats[metric.rateField]) + ' 当前速率';
  if (metric.kind === 'packets') return formatPps(stats[metric.rateField]) + ' 当前速率';
  return '累计 Counter · 仅增不减';
}

function NetworkChart({ data }) {
  const width = 820;
  const left = 58;
  const right = 806;
  const top = 18;
  const bottom = 218;
  const plotWidth = right - left;
  const plotHeight = bottom - top;
  const maxValue = Math.max(...data.flatMap((point) => [point.rx, point.tx])) * 1.15;

  const pointsFor = (key) =>
    data.map((point, index) => ({
      x: left + (index / (data.length - 1)) * plotWidth,
      y: bottom - (point[key] / maxValue) * plotHeight,
    }));

  const pathFor = (key) =>
    pointsFor(key)
      .map((point, index) => (index === 0 ? 'M ' : 'L ') + point.x.toFixed(1) + ' ' + point.y.toFixed(1))
      .join(' ');

  const areaFor = (key) => pathFor(key) + ' L ' + right + ' ' + bottom + ' L ' + left + ' ' + bottom + ' Z';
  const rxPoints = pointsFor('rx');
  const txPoints = pointsFor('tx');
  const rxLast = rxPoints[rxPoints.length - 1];
  const txLast = txPoints[txPoints.length - 1];

  return (
    <div className="chartWrap">
      <svg className="networkChart" viewBox={'0 0 ' + width + ' 250'} role="img" aria-label="最近 108 秒网络接收与发送吞吐率趋势">
        <defs>
          <linearGradient id="receiveArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#54e5b5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#54e5b5" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="transmitArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#62a8ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#62a8ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = top + ratio * plotHeight;
          return (
            <g key={ratio}>
              <line className="chartGridLine" x1={left} x2={right} y1={y} y2={y} />
              <text className="chartAxisLabel" x="3" y={y + 4}>
                {formatRate(maxValue * (1 - ratio)).replace(' MiB/s', '')}
              </text>
            </g>
          );
        })}

        <text className="chartUnit" x="3" y="10">MiB/s</text>
        <path d={areaFor('rx')} fill="url(#receiveArea)" />
        <path d={areaFor('tx')} fill="url(#transmitArea)" />
        <path className="receiveLine" d={pathFor('rx')} />
        <path className="transmitLine" d={pathFor('tx')} />
        <circle className="receivePoint" cx={rxLast.x} cy={rxLast.y} r="4" />
        <circle className="transmitPoint" cx={txLast.x} cy={txLast.y} r="4" />
        <text className="chartAxisLabel" x={left} y="242">-108s</text>
        <text className="chartAxisLabel" x={(left + right) / 2} y="242" textAnchor="middle">-54s</text>
        <text className="chartAxisLabel" x={right} y="242" textAnchor="end">现在</text>
      </svg>
    </div>
  );
}

function ScopeIcon({ type }) {
  return type === 'container' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 7.5 4.1v9.8L12 21l-7.5-4.1V7.1L12 3Z" />
      <path d="m4.8 7.3 7.2 4 7.2-4M12 11.3V21" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M3.5 9h17M7 6.5h.01M10 6.5h.01M7 13h6M7 16h4" />
    </svg>
  );
}

export default function Home() {
  const [resources, setResources] = useState(initialResources);
  const resourcesRef = useRef(initialResources);
  const [histories, setHistories] = useState(initialHistories);
  const [scope, setScope] = useState('all');
  const [paused, setPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [edgeApi, setEdgeApi] = useState({ status: '检测中', region: '—' });

  useEffect(() => {
    let active = true;
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/health', { cache: 'no-store' });
        const data = await response.json();
        if (active) setEdgeApi({ status: data.ok ? '已连接' : '异常', region: data.region || 'Vercel Edge' });
      } catch {
        if (active) setEdgeApi({ status: '连接失败', region: '—' });
      }
    };

    checkHealth();
    const healthTimer = setInterval(checkHealth, 15000);
    return () => {
      active = false;
      clearInterval(healthTimer);
    };
  }, []);

  useEffect(() => {
    setLastUpdated(new Date());
    if (paused) return undefined;

    const timer = setInterval(() => {
      const nextResources = resourcesRef.current.map(advanceResource);
      resourcesRef.current = nextResources;
      setResources(nextResources);
      setHistories((current) => {
        const next = {};
        scopes.forEach((item) => {
          const totals = aggregate(getScopedResources(nextResources, item.id));
          next[item.id] = [...current[item.id].slice(1), { rx: totals.rxRate, tx: totals.txRate }];
        });
        return next;
      });
      setLastUpdated(new Date());
    }, REFRESH_INTERVAL);

    return () => clearInterval(timer);
  }, [paused]);

  const visibleResources = useMemo(() => getScopedResources(resources, scope), [resources, scope]);
  const totals = useMemo(() => aggregate(visibleResources), [visibleResources]);
  const totalPacketsPerSecond = totals.rxPps + totals.txPps;
  const problemCount = visibleResources.filter((resource) => resource.status !== '健康').length;
  const gateway = resources.find((resource) => resource.id === 'container-gateway');
  const activeScope = scopes.find((item) => item.id === scope);

  return (
    <main className="appShell">
      <header className="topbar">
        <div className="brandBlock">
          <div className="brandMark"><span /></div>
          <div>
            <div className="eyebrow">CUBE · INFRASTRUCTURE OBSERVABILITY</div>
            <h1>网络指标监控</h1>
            <p className="subtitle">容器与虚拟机的实时流量、数据包及异常计数器</p>
          </div>
        </div>

        <div className="headerStatus">
          <div className="edgeState">
            <span className={'stateDot ' + (edgeApi.status === '已连接' ? 'online' : '')} />
            <div>
              <small>EDGE API · {edgeApi.region}</small>
              <strong>{edgeApi.status}</strong>
            </div>
          </div>
          <button className={'liveControl ' + (paused ? 'paused' : '')} type="button" onClick={() => setPaused((value) => !value)}>
            <span className="livePulse" />
            {paused ? '继续刷新' : '实时刷新中'}
          </button>
        </div>
      </header>

      <div className="toolbar">
        <div className="scopeTabs" aria-label="资源类型筛选">
          {scopes.map((item) => (
            <button
              className={scope === item.id ? 'active' : ''}
              type="button"
              key={item.id}
              aria-pressed={scope === item.id}
              onClick={() => setScope(item.id)}
            >
              {item.label}<span>{getScopedResources(resources, item.id).length}</span>
            </button>
          ))}
        </div>
        <div className="refreshMeta">
          <span className="refreshDot" />
          {paused ? '数据已暂停' : '每 3 秒更新'}<i />
          {lastUpdated ? lastUpdated.toLocaleTimeString('zh-CN', { hour12: false }) : '—'}
        </div>
      </div>

      <section className="summaryGrid" aria-label="网络摘要">
        <article className="summaryCard receive">
          <div className="summaryTop"><span>总接收速率</span><b>RX</b></div>
          <strong>{formatRate(totals.rxRate)}</strong>
          <div className="summaryFoot"><span className="arrow receiveArrow">↓</span>{formatPps(totals.rxPps)}</div>
        </article>
        <article className="summaryCard transmit">
          <div className="summaryTop"><span>总发送速率</span><b>TX</b></div>
          <strong>{formatRate(totals.txRate)}</strong>
          <div className="summaryFoot"><span className="arrow transmitArrow">↑</span>{formatPps(totals.txPps)}</div>
        </article>
        <article className="summaryCard packets">
          <div className="summaryTop"><span>实时包速率</span><b>PPS</b></div>
          <strong>{formatPps(totalPacketsPerSecond)}</strong>
          <div className="summaryFoot">接收 + 发送数据包</div>
        </article>
        <article className={'summaryCard health ' + (problemCount ? 'hasIssue' : '')}>
          <div className="summaryTop"><span>资源健康度</span><b>HEALTH</b></div>
          <strong>{visibleResources.length - problemCount}<em> / {visibleResources.length}</em></strong>
          <div className="summaryFoot">{problemCount ? problemCount + ' 个接口需要关注' : '所有接口运行正常'}</div>
        </article>
      </section>

      <section className="overviewGrid">
        <article className="panel trendPanel">
          <div className="panelHeader">
            <div><span className="sectionLabel">THROUGHPUT TREND</span><h2>网络吞吐趋势</h2></div>
            <div className="chartLegend">
              <span><i className="receiveLegend" />接收 {formatRate(totals.rxRate)}</span>
              <span><i className="transmitLegend" />发送 {formatRate(totals.txRate)}</span>
            </div>
          </div>
          <NetworkChart data={histories[scope]} />
        </article>

        <aside className="panel insightPanel">
          <div className="panelHeader">
            <div><span className="sectionLabel warningLabel">ATTENTION</span><h2>异常聚焦</h2></div>
            <span className="issueBadge">1 active</span>
          </div>
          <div className="issueResource">
            <div className="resourceIcon containerIcon"><ScopeIcon type="container" /></div>
            <div><strong>edge-gateway</strong><span>eth0 · worker-tpe-01</span></div>
            <b>告警</b>
          </div>
          <div className="issueRows">
            <div><span>接收错误</span><strong>{formatCount(gateway.rxErrors)}</strong><small>network_receive_errors_total</small></div>
            <div><span>接收丢包</span><strong>{formatCount(gateway.rxDropped)}</strong><small>network_receive_dropped_total</small></div>
          </div>
          <div className="recommendation">
            <span>建议</span>
            <p>检查 eth0 队列、宿主机带宽上限及 CNI 网络策略。</p>
          </div>
        </aside>
      </section>

      <section className="metricsSection">
        <div className="sectionHeader">
          <div><span className="sectionLabel">PROMETHEUS COUNTERS</span><h2>完整网络指标集</h2></div>
          <p>当前范围：{activeScope.label} · 聚合 {visibleResources.length} 个资源</p>
        </div>
        <div className="metricGrid">
          {metricDefinitions.map((metric) => {
            const isIssueMetric = metric.kind === 'counter' && totals[metric.field] > 0;
            return (
              <article className={'metricCard ' + metric.direction + (isIssueMetric ? ' issueMetric' : '')} key={metric.key}>
                <div className="metricCardTop">
                  <span className="directionIcon">{metric.direction === 'receive' ? '↓' : '↑'}</span>
                  <span className="metricType">{metric.kind === 'counter' ? 'COUNTER' : metric.kind.toUpperCase()}</span>
                </div>
                <span className="metricLabel">{metric.label}</span>
                <strong>{metricValue(metric, totals)}</strong>
                <small>{metricDetail(metric, totals)}</small>
                <code>{metric.key}</code>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel resourcePanel">
        <div className="panelHeader resourceHeader">
          <div><span className="sectionLabel">RESOURCE INTERFACES</span><h2>资源网络接口</h2></div>
          <span className="resourceCount">{visibleResources.length} 个资源</span>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>资源</th><th>类型</th><th>网络接口</th><th>吞吐率 RX / TX</th>
                <th>包速率 RX / TX</th><th>错误 RX / TX</th><th>丢包 RX / TX</th><th>状态</th>
              </tr>
            </thead>
            <tbody>
              {visibleResources.map((resource) => (
                <tr key={resource.id}>
                  <td><div className="resourceName">{resource.name}</div><div className="resourceDetail">{resource.detail}</div></td>
                  <td>
                    <span className={'typePill ' + resource.type}>
                      <ScopeIcon type={resource.type} />{resource.type === 'container' ? '容器' : '虚拟机'}
                    </span>
                  </td>
                  <td><div className="interfaceName">{resource.interfaceName}</div><div className="resourceDetail">{resource.host}</div></td>
                  <td>
                    <div className="dualValue receiveValue"><span>↓</span>{formatRate(resource.rxRate)}</div>
                    <div className="dualValue transmitValue"><span>↑</span>{formatRate(resource.txRate)}</div>
                  </td>
                  <td>
                    <div className="dualValue"><span>↓</span>{formatPps(resource.rxPps)}</div>
                    <div className="dualValue"><span>↑</span>{formatPps(resource.txPps)}</div>
                  </td>
                  <td><div className={resource.rxErrors ? 'counterValue warningValue' : 'counterValue'}>{formatCount(resource.rxErrors)} / {formatCount(resource.txErrors)}</div></td>
                  <td><div className={resource.rxDropped ? 'counterValue warningValue' : 'counterValue'}>{formatCount(resource.rxDropped)} / {formatCount(resource.txDropped)}</div></td>
                  <td><span className={'status ' + (resource.status === '健康' ? 'healthy' : 'warning')}>{resource.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer>
        <span>Cube Network Observer</span>
        <span>当前为演示数据 · Counter 值按 Prometheus 语义持续累加</span>
      </footer>
    </main>
  );
}
