// flow-operator/components.jsx
// Eryxon Flow — operator (tablet, dark, shop-floor) UI kit components.
// Designed for portrait or landscape tablet at ~1 m read distance.

const { useState, useMemo } = React;

/* ============================================================
   Tiny Lucide-style icons (stroke 1.5, currentColor)
   ============================================================ */
const Icon = ({ d, size = 20, className = "" }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {d.split('|').map((path, i) => <path key={i} d={path} />)}
  </svg>
);
const I = {
  play:     <Icon d="M5 3v18l15-9z" />,
  pause:    <Icon d="M6 5v14M18 5v14" />,
  check:    <Icon d="M5 12l5 5L20 7" />,
  alert:    <Icon d="M12 9v4|M12 17h.01|M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />,
  clock:    <Icon d="M12 6v6l4 2|M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  search:   <Icon d="m21 21-4.3-4.3|M10 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z" />,
  filter:   <Icon d="M3 6h18M6 12h12M10 18h4" />,
  user:     <Icon d="M20 21a8 8 0 0 0-16 0|M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />,
  package:  <Icon d="M21 16V8l-9-5-9 5v8l9 5 9-5Z|M3.27 6.96 12 12.01l8.73-5.05|M12 22.08V12" />,
  file:     <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6" />,
  box:      <Icon d="M21 16V8l-9-5-9 5v8l9 5 9-5Z" />,
  chevron:  <Icon d="m9 18 6-6-6-6" />,
  logout:   <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|M16 17l5-5-5-5|M21 12H9" />,
  wifi:     <Icon d="M5 12.55a11 11 0 0 1 14.08 0|M1.42 9a16 16 0 0 1 21.16 0|M8.53 16.11a6 6 0 0 1 6.95 0|M12 20h.01" />,
};

window.I = I;

/* ============================================================
   Status & due-date helpers
   ============================================================ */
const stripeOf = (status) => ({
  in_progress: 'bg-active',
  not_started: 'bg-pending',
  completed:   'bg-completed',
  on_hold:     'bg-on-hold',
}[status] || 'bg-pending');

const dueBucket = (dueDate) => {
  if (!dueDate) return null;
  // Date-only comparison — strip times so "today" = today regardless of hour
  const d = new Date(dueDate);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return null;
};

const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(s);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

/* ============================================================
   Status bar (top chrome — operator identity + connectivity)
   ============================================================ */
function OperatorStatusBar({ operator, cell, connected = true, onLogout }) {
  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return (
    <header className="op-status-bar">
      <div className="op-status-left">
        <div className="op-brand">
          <img src="../../assets/eryxon-mark-flat.svg" alt="" width="32" height="32" />
          <span className="op-brand-name">eryxon flow</span>
        </div>
        <div className="op-status-divider" />
        <div className="op-cell-pill">
          <span className="op-cell-dot" />
          <span>{cell}</span>
        </div>
      </div>

      <div className="op-status-right">
        <span className="op-status-meta">
          {I.wifi}
          <span className={`op-connection ${connected ? 'is-on' : 'is-off'}`}>{connected ? 'Online' : 'Offline'}</span>
        </span>
        <span className="op-status-time">{time}</span>
        <button className="op-status-user" onClick={onLogout}>
          <span className="op-avatar">{operator.initials}</span>
          <span className="op-name">{operator.name}</span>
          {I.chevron}
        </button>
      </div>
    </header>
  );
}

/* ============================================================
   Search + filter bar
   ============================================================ */
function QueueToolbar({ query, onQuery, mine, onMine, filterCount = 0 }) {
  return (
    <div className="queue-toolbar">
      <label className="queue-search">
        <span className="queue-search-icon">{I.search}</span>
        <input
          type="search"
          placeholder="Search WO, part, customer…"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </label>
      <button
        className={`queue-tab ${mine ? 'is-active' : ''}`}
        onClick={() => onMine(!mine)}
      >
        {I.user} Mine only
      </button>
      <button className="queue-tab">
        {I.filter} Filters
        {filterCount > 0 && <span className="queue-tab-count">{filterCount}</span>}
      </button>
    </div>
  );
}

/* ============================================================
   Operation card (the operator's atomic unit)
   ============================================================ */
function OperationCard({ op, onOpen, mine = false }) {
  const due = dueBucket(op.dueDate);
  const isActive = op.status === 'in_progress';
  const overtime = op.actualHours > op.estimatedHours;
  const remaining = (op.estimatedHours - op.actualHours).toFixed(1);

  return (
    <button className={`op-card ${isActive ? 'is-active' : ''}`} onClick={() => onOpen(op)}>
      <span className={`op-card-stripe ${stripeOf(op.status)} ${isActive ? 'is-pulse' : ''}`} />
      <div className="op-card-body">
        <div className="op-card-row">
          <span className="op-card-job">{op.jobNumber}</span>
          {due && (
            <span className={`op-due op-due-${due}`}>
              <span className="op-due-tag">{due.toUpperCase()}</span>
              <span className="op-due-date">{fmtDate(op.dueDate)}</span>
            </span>
          )}
        </div>
        <div className="op-card-title">{op.operationName}</div>
        <div className="op-card-meta">
          <span>{op.partNumber}</span>
          {op.material && (<><span className="dot">·</span><span>{op.material}</span></>)}
        </div>
        <div className="op-card-bottom">
          <div className="op-card-stat">
            <span className="op-card-clock">{I.clock}</span>
            <span className={overtime ? 'is-overtime' : ''}>
              {overtime ? '+' : ''}{Math.abs(remaining)}h
            </span>
            <span className="dot">·</span>
            <span>{op.qty} pcs</span>
          </div>
          <div className="op-card-flags">
            {isActive && <span className="flag flag-active">{I.user} {op.activeOperator}</span>}
            {mine && !isActive && <span className="flag flag-mine">Mine</span>}
            {op.hasPdf && <span className="flag-ic" title="PDF attached">{I.file}</span>}
            {op.hasModel && <span className="flag-ic" title="3D model">{I.box}</span>}
            {op.issues > 0 && (
              <span className={`flag-issues ${op.issuesSeverity === 'high' ? 'is-high' : ''}`}>
                {I.alert} {op.issues}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ============================================================
   Footer bar — currently-timing widget (sticky bottom)
   ============================================================ */
function CurrentlyTimingBar({ active, elapsed, onPause, onComplete, onIssue }) {
  if (!active) return null;
  return (
    <div className="op-footer-bar">
      <div className="op-footer-info">
        <div className="op-footer-label">Currently timing</div>
        <div className="op-footer-title">{active.operationName} <span className="op-footer-job">{active.jobNumber}</span></div>
        <div className="op-footer-elapsed">{elapsed}</div>
      </div>
      <div className="op-footer-actions">
        <button className="op-btn op-btn-pause" onClick={onPause}>{I.pause} Pause</button>
        <button className="op-btn op-btn-issue" onClick={onIssue}>{I.alert} Issue</button>
        <button className="op-btn op-btn-complete" onClick={onComplete}>{I.check} Complete</button>
      </div>
    </div>
  );
}

/* ============================================================
   Operation detail (modal mock — opened from an OperationCard)
   ============================================================ */
function OperationDetail({ op, onClose, onStart }) {
  if (!op) return null;
  return (
    <div className="op-modal-scrim" onClick={onClose}>
      <div className="op-modal" onClick={(e) => e.stopPropagation()}>
        <header className="op-modal-head">
          <div>
            <div className="op-modal-label">Operation</div>
            <h2 className="op-modal-title">{op.operationName}</h2>
            <div className="op-modal-sub">{op.jobNumber} · {op.partNumber} · {op.material}</div>
          </div>
          <button className="op-modal-close" onClick={onClose}>✕</button>
        </header>
        <div className="op-modal-grid">
          <div className="op-modal-stat">
            <div className="op-modal-stat-label">Estimated</div>
            <div className="op-modal-stat-value">{op.estimatedHours.toFixed(1)}<span>h</span></div>
          </div>
          <div className="op-modal-stat">
            <div className="op-modal-stat-label">Actual</div>
            <div className="op-modal-stat-value">{op.actualHours.toFixed(1)}<span>h</span></div>
          </div>
          <div className="op-modal-stat">
            <div className="op-modal-stat-label">Quantity</div>
            <div className="op-modal-stat-value">{op.qty}<span>pcs</span></div>
          </div>
          <div className="op-modal-stat">
            <div className="op-modal-stat-label">Due</div>
            <div className="op-modal-stat-value op-modal-stat-due">{fmtDate(op.dueDate)}</div>
          </div>
        </div>
        <div className="op-modal-section">
          <div className="op-modal-section-label">Routing</div>
          <div className="op-routing">
            {['Cutting','Bending','Welding','Assembly','Finishing'].map((stage, i) => (
              <span key={stage} className={`op-routing-step stage-${stage.toLowerCase()} ${i < 2 ? 'is-done' : i === 2 ? 'is-current' : ''}`}>
                <span className="op-routing-dot" /> {stage}
              </span>
            ))}
          </div>
        </div>
        <div className="op-modal-section">
          <div className="op-modal-section-label">Files</div>
          <div className="op-modal-files">
            <div className="op-modal-file">{I.file} PN-902-A_drawing.pdf <span>1.2 MB</span></div>
            <div className="op-modal-file">{I.box} PN-902-A_model.step <span>344 KB</span></div>
          </div>
        </div>
        <footer className="op-modal-foot">
          <button className="op-btn op-btn-secondary" onClick={onClose}>Close</button>
          <button className="op-btn op-btn-start" onClick={onStart}>{I.play} Start work</button>
        </footer>
      </div>
    </div>
  );
}

/* ============================================================
   Login (terminal)
   ============================================================ */
function TerminalLogin({ onLogin }) {
  const [pin, setPin] = useState('');
  const operators = [
    { id: 1, name: 'Jonas Bekker',  initials: 'JB', cell: 'Laser cutting'   },
    { id: 2, name: 'Sara De Vries', initials: 'SD', cell: 'Press brake'     },
    { id: 3, name: 'Mehmet Aydin',  initials: 'MA', cell: 'Welding'         },
    { id: 4, name: 'Anouk Peeters', initials: 'AP', cell: 'Assembly'        },
  ];
  return (
    <div className="op-login">
      <div className="op-login-card">
        <img src="../../assets/eryxon-mark-flat.svg" alt="" width="48" height="48" />
        <h1 className="op-login-title">Sign in to your station</h1>
        <p className="op-login-sub">Tap your name to continue.</p>
        <div className="op-login-grid">
          {operators.map((o) => (
            <button key={o.id} className="op-login-op" onClick={() => onLogin(o)}>
              <span className="op-login-avatar">{o.initials}</span>
              <span className="op-login-op-name">{o.name}</span>
              <span className="op-login-op-cell">{o.cell}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  OperatorStatusBar,
  QueueToolbar,
  OperationCard,
  CurrentlyTimingBar,
  OperationDetail,
  TerminalLogin,
});
