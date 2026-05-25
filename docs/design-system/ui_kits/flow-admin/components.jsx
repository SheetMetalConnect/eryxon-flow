// ui_kits/flow-admin/components.jsx
// Eryxon Flow — admin (desktop, light) UI kit components.

const { useState, useMemo } = React;

/* ============================================================
   Icons (Lucide-style, stroke 1.5)
   ============================================================ */
const Ico = ({ d, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
);
const A = {
  dashboard: <Ico d="M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 9h8V3h-8z" />,
  jobs:      <Ico d="M3 7h18M3 12h18M3 17h12" />,
  parts:     <Ico d="M21 16V8l-9-5-9 5v8l9 5 9-5Z|M3.27 6.96 12 12.01l8.73-5.05|M12 22.08V12" />,
  ops:       <Ico d="M5 12h14M5 6h14M5 18h14" />,
  schedule:  <Ico d="M8 2v4M16 2v4M3 10h18|M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />,
  capacity:  <Ico d="M3 3v18h18|M7 14l4-4 4 4 6-6" />,
  issues:    <Ico d="M12 9v4|M12 17h.01|M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />,
  data:      <Ico d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2|M3 16v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2|M3 12h18" />,
  settings:  <Ico d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z|M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.46.42.94 1 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />,
  search:    <Ico d="m21 21-4.3-4.3|M10 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z" />,
  bell:      <Ico d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9|M10.3 21a1.94 1.94 0 0 0 3.4 0" />,
  plus:      <Ico d="M12 5v14M5 12h14" />,
  chevron:   <Ico d="m9 18 6-6-6-6" />,
  chevDown:  <Ico d="m6 9 6 6 6-6" />,
  arrowUp:   <Ico d="M12 19V5M5 12l7-7 7 7" />,
  arrowDown: <Ico d="M12 5v14M5 12l7 7 7-7" />,
  dots:      <Ico d="M12 12h.01M19 12h.01M5 12h.01" />,
};
window.A = A;

/* ============================================================
   Sidebar
   ============================================================ */
function AdminSidebar({ current, onNav }) {
  const groups = [
    { label: 'Overview', items: [
      { id: 'dashboard', icon: A.dashboard, label: 'Dashboard' },
    ]},
    { label: 'Production', items: [
      { id: 'jobs',      icon: A.jobs,     label: 'Jobs', count: 47 },
      { id: 'parts',     icon: A.parts,    label: 'Parts' },
      { id: 'ops',       icon: A.ops,      label: 'Operations' },
      { id: 'schedule',  icon: A.schedule, label: 'Schedule' },
      { id: 'capacity',  icon: A.capacity, label: 'Capacity' },
    ]},
    { label: 'Quality', items: [
      { id: 'issues',    icon: A.issues, label: 'Issues', count: 3, urgent: true },
    ]},
    { label: 'System', items: [
      { id: 'data',      icon: A.data,     label: 'Data' },
      { id: 'settings',  icon: A.settings, label: 'Settings' },
    ]},
  ];
  return (
    <aside className="ad-sidebar">
      <div className="ad-brand">
        <img src="../../assets/eryxon-mark-light.svg" width="32" height="32" alt="" />
        <span className="ad-brand-name">eryxon <span>flow</span></span>
      </div>
      <nav className="ad-nav">
        {groups.map(g => (
          <div key={g.label} className="ad-nav-group">
            <div className="ad-nav-group-label">{g.label}</div>
            {g.items.map(it => (
              <button
                key={it.id}
                className={`ad-nav-item ${current === it.id ? 'is-active' : ''}`}
                onClick={() => onNav(it.id)}
              >
                <span className="ad-nav-ic">{it.icon}</span>
                <span>{it.label}</span>
                {it.count != null && (
                  <span className={`ad-nav-count ${it.urgent ? 'is-urgent' : ''}`}>
                    {it.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>
      <div className="ad-sidebar-foot">
        <div className="ad-tenant">
          <span className="ad-tenant-mark">A</span>
          <div>
            <div className="ad-tenant-name">Acme Fabrications</div>
            <div className="ad-tenant-meta">Vienna · 3 cells active</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ============================================================
   App header (top bar)
   ============================================================ */
function AdminHeader({ title, breadcrumb }) {
  return (
    <header className="ad-header">
      <div>
        {breadcrumb && (
          <div className="ad-breadcrumb">
            {breadcrumb.map((b, i) => (
              <React.Fragment key={i}>
                <span>{b}</span>
                {i < breadcrumb.length - 1 && <span className="ad-breadcrumb-sep">{A.chevron}</span>}
              </React.Fragment>
            ))}
          </div>
        )}
        <h1 className="ad-page-title">{title}</h1>
      </div>
      <div className="ad-header-tools">
        <label className="ad-search">
          <span className="ad-search-ic">{A.search}</span>
          <input placeholder="Search jobs, parts, operators…" />
          <span className="ad-search-kbd">⌘K</span>
        </label>
        <button className="ad-icon-btn" aria-label="Notifications">
          {A.bell}
          <span className="ad-icon-dot" />
        </button>
        <button className="btn btn-primary">{A.plus} New job</button>
      </div>
    </header>
  );
}

/* ============================================================
   KPI tile
   ============================================================ */
function KpiTile({ label, value, unit, delta, intent = 'neutral' }) {
  const sign = delta > 0 ? '+' : '';
  return (
    <div className="ad-kpi">
      <div className="ad-kpi-label">{label}</div>
      <div className="ad-kpi-value">
        {value}<span className="ad-kpi-unit">{unit}</span>
      </div>
      {delta != null && (
        <div className={`ad-kpi-delta is-${intent}`}>
          {intent === 'positive' ? A.arrowUp : A.arrowDown}
          <span>{sign}{delta}%</span>
          <span className="ad-kpi-delta-sub">vs last week</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Jobs table — the core admin surface
   ============================================================ */
const STATUS_LABEL = {
  in_progress: 'Active',
  not_started: 'Pending',
  completed:   'Completed',
  on_hold:     'On hold',
  blocked:     'Blocked',
};
const STATUS_TOKEN = {
  in_progress: 'status-active',
  not_started: 'status-pending',
  completed:   'status-completed',
  on_hold:     'status-on-hold',
  blocked:     'status-blocked',
};

function StatusChip({ status }) {
  return (
    <span className={`chip chip-${STATUS_TOKEN[status]}`}>
      <span className="chip-dot" /> {STATUS_LABEL[status]}
    </span>
  );
}

function FlowPath({ routing }) {
  return (
    <div className="ad-flow">
      {routing.map((step, i) => (
        <React.Fragment key={step.cell}>
          {i > 0 && <span className="ad-flow-arrow">→</span>}
          <span
            className={`ad-flow-cell stage-${step.cell.toLowerCase()} ${step.done ? 'is-done' : step.current ? 'is-current' : ''}`}
            title={`${step.cell} · ${step.completed}/${step.total}`}
          >
            {step.cell.slice(0, 3).toUpperCase()}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function JobsTable({ jobs, onOpen }) {
  return (
    <div className="ad-card ad-table-wrap">
      <table className="ad-table">
        <thead>
          <tr>
            <th>Job</th>
            <th>Customer</th>
            <th>Parts</th>
            <th>Routing</th>
            <th className="num">Progress</th>
            <th>Status</th>
            <th>Due</th>
            <th className="num">Owner</th>
            <th style={{width: 32}}></th>
          </tr>
        </thead>
        <tbody>
          {jobs.map(j => (
            <tr key={j.id} onClick={() => onOpen(j)}>
              <td className="mono">{j.jobNumber}</td>
              <td><div className="cell-strong">{j.customer}</div><div className="cell-sub">{j.po}</div></td>
              <td className="num">{j.parts}</td>
              <td><FlowPath routing={j.routing} /></td>
              <td className="num">
                <div className="ad-progress">
                  <div className="ad-progress-track">
                    <div className="ad-progress-fill" style={{width: `${j.progress}%`}} />
                  </div>
                  <span>{j.progress}%</span>
                </div>
              </td>
              <td><StatusChip status={j.status} /></td>
              <td>
                <div className={`due ${j.dueState}`}>
                  {j.dueState !== 'ok' && <span className="due-tag">{j.dueState.toUpperCase()}</span>}
                  <span>{j.due}</span>
                </div>
              </td>
              <td><div className="ad-owner"><span className="ad-owner-avatar">{j.owner.slice(0, 2).toUpperCase()}</span><span>{j.owner}</span></div></td>
              <td><button className="ad-row-action" aria-label="More">{A.dots}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================
   QRM capacity tile (cell load bar)
   ============================================================ */
function CapacityRow({ cell, current, capacity }) {
  const pct = Math.min(120, Math.round((current / capacity) * 100));
  const over = pct > 100;
  const intent = over ? 'over' : pct > 80 ? 'tight' : 'ok';
  return (
    <div className="ad-cap-row">
      <div className="ad-cap-cell">
        <span className={`ad-cap-dot stage-${cell.toLowerCase()}`} />
        <span className="ad-cap-name">{cell}</span>
      </div>
      <div className="ad-cap-bar">
        <div className={`ad-cap-fill is-${intent}`} style={{width: `${Math.min(pct, 100)}%`}} />
        {over && <div className="ad-cap-over" style={{width: `${pct - 100}%`}} />}
      </div>
      <div className={`ad-cap-num is-${intent}`}>
        {current}<span>/{capacity}h</span>
      </div>
    </div>
  );
}

Object.assign(window, {
  AdminSidebar, AdminHeader, KpiTile, JobsTable, StatusChip, FlowPath, CapacityRow,
});
