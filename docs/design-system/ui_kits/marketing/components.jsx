// ui_kits/marketing/components.jsx
// eryxon.eu — marketing UI kit. Light mode, calm, utilitarian.

const { useState } = React;

const M = {
  arrow:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  check:    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>,
  github:   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  menu:     <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/></svg>,
};

/* ---------- Header ---------- */
function MarketingHeader() {
  return (
    <header className="mk-header">
      <a className="mk-brand" href="#">
        <img src="../../assets/eryxon-mark-light.svg" width="32" height="32" alt="" />
        <span>eryxon</span>
      </a>
      <nav className="mk-nav">
        <a href="#product">Product</a>
        <a href="#docs">Docs</a>
        <a href="#pricing">Pricing</a>
        <a href="#guides">Guides</a>
        <a href="#changelog">Changelog</a>
      </nav>
      <div className="mk-header-cta">
        <a href="#" className="mk-link">Sign in</a>
        <a href="#" className="mk-btn mk-btn-primary">Start free trial</a>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="mk-hero">
      <div className="mk-hero-eyebrow">
        <span className="mk-tag">v0.5.1 · self-hostable · BSL 1.1</span>
      </div>
      <h1 className="mk-h1">A calm MES for job shops that ship.</h1>
      <p className="mk-lead">
        Eryxon Flow tracks jobs through cutting, bending, welding, and assembly — from
        one tablet on the shop floor to the planner's desktop. No spreadsheets, no
        whiteboards, no decorative noise.
      </p>
      <div className="mk-hero-cta">
        <a href="#" className="mk-btn mk-btn-primary mk-btn-lg">Start free trial {M.arrow}</a>
        <a href="#" className="mk-btn mk-btn-secondary mk-btn-lg">{M.github} View on GitHub</a>
      </div>
      <div className="mk-hero-trust">
        <span>Trusted by metal fabricators across the EU</span>
        <div className="mk-trust-logos">
          {['Acme Fab', 'Demar Laser', 'P&G Metaal', 'Singeling', 'Van Enkhuizen', 'Goma'].map(n => (
            <span key={n} className="mk-trust-logo">{n}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Product preview frame ---------- */
function ProductFrame() {
  return (
    <div className="mk-product">
      <div className="mk-product-chrome">
        <span className="mk-product-dot" />
        <span className="mk-product-dot" />
        <span className="mk-product-dot" />
        <div className="mk-product-url">app.eryxon.eu/operator/work-queue</div>
      </div>
      <div className="mk-product-shot" data-theme="dark">
        <div className="mk-shot-row">
          <div className="mk-shot-brand">
            <img src="../../assets/eryxon-mark-flat.svg" width="20" height="20" alt="" />
            <span>eryxon flow</span>
          </div>
          <div className="mk-shot-cell">● Laser cutting</div>
          <div className="mk-shot-time">19:46</div>
        </div>
        <div className="mk-shot-title">Work queue</div>
        <div className="mk-shot-cards">
          {[
            { stripe: 'active', wo: 'WO-4218', op: 'Laser cut', part: 'PN-902-A', tag: 'TODAY', tagCls: 'today', mine: true },
            { stripe: 'pending', wo: 'WO-4225', op: 'TIG weld assembly', part: 'PN-1021', tag: 'SOON', tagCls: 'soon' },
            { stripe: 'on-hold', wo: 'WO-4221', op: 'Press brake bend', part: 'PN-887', tag: 'OVERDUE', tagCls: 'overdue' },
          ].map(c => (
            <div key={c.wo} className="mk-shot-card">
              <div className={`mk-shot-stripe is-${c.stripe}`}></div>
              <div className="mk-shot-card-body">
                <div className="mk-shot-card-row">
                  <span className="mk-shot-wo">{c.wo}</span>
                  <span className={`mk-shot-tag is-${c.tagCls}`}>{c.tag}</span>
                </div>
                <div className="mk-shot-card-title">{c.op}</div>
                <div className="mk-shot-card-meta">{c.part} · Stainless 304</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Features ---------- */
function FeatureGrid() {
  const features = [
    {
      title: 'Touch-friendly operator terminals',
      body: 'Kanban work queues organised by production cell. 56 px touch targets. Glanceable status, due-date urgency, and elapsed timing from one metre away.',
    },
    {
      title: 'Job & part tracking',
      body: 'Full production visibility through cutting, bending, welding, assembly, finishing. Routing visualisation across cells. WIP limits and capacity overview.',
    },
    {
      title: '3D STEP viewer',
      body: 'Browser-based CAD. No software install. Measurement, exploded views, and embedded inside the operator detail modal.',
    },
    {
      title: '30+ REST endpoints',
      body: 'Webhook notifications for lifecycle events. Planning adapters for FrePPLe and Odoo MRP. MQTT connectivity with retry, circuit breaker, and dead-letter queue.',
    },
    {
      title: 'Self-hostable, source-available',
      body: 'BSL 1.1 — free for your business. Self-host via Docker Compose, or use the hosted version at app.eryxon.eu. Converts to Apache 2.0 after the BSL change date.',
    },
    {
      title: 'Multi-tenant SaaS',
      body: 'Row-level security with PostgreSQL. Multi-language (EN / NL / DE). Built for shops with one site and groups of shops with many.',
    },
  ];
  return (
    <section className="mk-section" id="product">
      <div className="mk-section-head">
        <span className="mk-section-eyebrow">What you get</span>
        <h2 className="mk-h2">Everything a high-mix, low-volume shop needs.</h2>
        <p className="mk-section-lead">
          No add-on store, no per-seat extras, no surprise modules. The full
          MES from day one — tablet to planner to API.
        </p>
      </div>
      <div className="mk-feature-grid">
        {features.map((f, i) => (
          <article key={i} className="mk-feature">
            <div className="mk-feature-num">{String(i + 1).padStart(2, '0')}</div>
            <h3 className="mk-feature-title">{f.title}</h3>
            <p className="mk-feature-body">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Code sample (API) ---------- */
function ApiBlock() {
  return (
    <section className="mk-section mk-section-dark" id="api">
      <div className="mk-api-grid">
        <div>
          <span className="mk-section-eyebrow on-dark">REST + Webhooks</span>
          <h2 className="mk-h2 on-dark">An API your ERP can actually talk to.</h2>
          <p className="mk-section-lead on-dark">
            30+ endpoints with filtering, pagination, search, and webhook
            dispatch. Built for ERP-to-MES sync — not just point-and-click.
          </p>
          <ul className="mk-api-list">
            <li>{M.check} Bearer-token auth with scoped API keys</li>
            <li>{M.check} Idempotent writes with client-supplied keys</li>
            <li>{M.check} Webhooks for every lifecycle event</li>
            <li>{M.check} MCP server for AI assistants</li>
          </ul>
        </div>
        <div className="mk-code">
          <div className="mk-code-head">
            <span className="mk-code-lang">cURL</span>
            <button className="mk-code-copy">Copy</button>
          </div>
          <pre>{`$ curl https://app.eryxon.eu/api/jobs \\
    -H "Authorization: Bearer ery_live_..." \\
    -X POST -H "Content-Type: application/json" \\
    -d '{
      "job_number": "WO-4218",
      "customer":   "Acme Fabrications",
      "due_date":   "2026-06-12",
      "parts": [
        { "part_number": "PN-902-A",
          "quantity":   200,
          "operations": ["cut","bend","weld"] }
      ]
    }'

> 201 Created
> { "id": "job_01H...", "job_number": "WO-4218" }`}</pre>
        </div>
      </div>
    </section>
  );
}

/* ---------- Pricing ---------- */
function Pricing() {
  const tiers = [
    {
      name: 'Self-host',
      price: 'Free',
      sub: 'BSL 1.1 · for your shop',
      features: ['Full MES feature set', 'Docker Compose deploy', 'Bring your own Supabase', 'Community support'],
      cta: 'Read the docs', href: '#',
    },
    {
      name: 'Hosted Starter',
      price: '€199', period: '/month',
      sub: 'Up to 25 operators',
      features: ['Hosted on app.eryxon.eu', 'Daily backups', 'Email support', '25 active operators included'],
      cta: 'Start free trial', href: '#',
      featured: true,
    },
    {
      name: 'Hosted Scale',
      price: 'From €699', period: '/month',
      sub: 'Unlimited operators',
      features: ['Everything in Starter', 'Priority support', 'Planning integrations included', 'SSO & SAML'],
      cta: 'Talk to sales', href: '#',
    },
  ];
  return (
    <section className="mk-section" id="pricing">
      <div className="mk-section-head">
        <span className="mk-section-eyebrow">Pricing</span>
        <h2 className="mk-h2">One simple plan per deployment style.</h2>
      </div>
      <div className="mk-pricing-grid">
        {tiers.map(t => (
          <div key={t.name} className={`mk-tier ${t.featured ? 'is-featured' : ''}`}>
            {t.featured && <span className="mk-tier-flag">Most shops pick this</span>}
            <div className="mk-tier-name">{t.name}</div>
            <div className="mk-tier-price">{t.price}<span>{t.period}</span></div>
            <div className="mk-tier-sub">{t.sub}</div>
            <ul className="mk-tier-features">
              {t.features.map(f => <li key={f}>{M.check}<span>{f}</span></li>)}
            </ul>
            <a className={`mk-btn ${t.featured ? 'mk-btn-primary' : 'mk-btn-secondary'} mk-btn-block`} href={t.href}>{t.cta}</a>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function MarketingFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-footer-grid">
        <div>
          <div className="mk-brand mk-brand-foot">
            <img src="../../assets/eryxon-mark-light.svg" width="28" height="28" alt="" />
            <span>eryxon</span>
          </div>
          <p className="mk-footer-tag">Source-available MES for European job shops. Self-host or use the hosted version.</p>
        </div>
        {[
          { h: 'Product',  items: ['Features', 'API', 'Changelog', 'Roadmap'] },
          { h: 'Docs',     items: ['Quick start', 'Architecture', 'Self-hosting', 'Operator manual'] },
          { h: 'Company',  items: ['About', 'Customers', 'Contact', 'Imprint'] },
        ].map(col => (
          <div key={col.h}>
            <div className="mk-footer-h">{col.h}</div>
            <ul className="mk-footer-list">{col.items.map(i => <li key={i}><a href="#">{i}</a></li>)}</ul>
          </div>
        ))}
      </div>
      <div className="mk-footer-bot">
        <span>© 2026 Eryxon. Made in Europe.</span>
        <span className="mk-footer-legal">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">BSL 1.1</a>
        </span>
      </div>
    </footer>
  );
}

Object.assign(window, {
  MarketingHeader, Hero, ProductFrame, FeatureGrid, ApiBlock, Pricing, MarketingFooter,
  HowItWorks, Testimonial, Integrations, CtaBanner,
});

/* ============================================================
   HowItWorks — 3-step process
   ============================================================ */
function HowItWorks() {
  const steps = [
    {
      n: '01',
      h: 'Import your jobs',
      b: 'Push from your ERP via the REST API, drop in a CSV, or use one of the planning adapters. Eryxon Flow normalises parts, operations, and routing so the floor sees the same shape regardless of upstream system.',
      tag: 'REST · CSV · Odoo · FrePPLe',
    },
    {
      n: '02',
      h: 'Operators work the queue',
      b: 'Each cell sees its own tablet. Tap an operation to open it, start the timer, mark good and scrap quantities, raise issues. Real-time updates push back to the planner without a page refresh.',
      tag: 'Tablet · 56 px touch targets · WebSocket',
    },
    {
      n: '03',
      h: 'Planners watch capacity',
      b: 'A QRM dashboard with WIP limits per cell, due-date heat, and an issue queue. Capacity over 100 % is flagged — no surprise overruns on Friday at 16:55.',
      tag: 'Capacity matrix · WIP limits · NCR queue',
    },
  ];
  return (
    <section className="mk-section" id="how">
      <div className="mk-section-head">
        <span className="mk-section-eyebrow">How it works</span>
        <h2 className="mk-h2">From ERP push to planner dashboard in three steps.</h2>
      </div>
      <ol className="mk-steps">
        {steps.map(s => (
          <li key={s.n} className="mk-step">
            <span className="mk-step-num">{s.n}</span>
            <div>
              <h3 className="mk-step-h">{s.h}</h3>
              <p className="mk-step-b">{s.b}</p>
              <span className="mk-step-tag">{s.tag}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ============================================================
   Testimonial — one quote, two stats
   ============================================================ */
function Testimonial() {
  return (
    <section className="mk-quote-section">
      <div className="mk-quote-wrap">
        <blockquote className="mk-quote">
          <p>"We were running the floor off three whiteboards and an Excel sheet a planner updated by hand. Eryxon Flow killed the whiteboards in week one. The operators stopped asking 'what's next' — they just look at the tablet."</p>
          <footer>
            <span className="mk-quote-name">Luc Vermeer</span>
            <span className="mk-quote-role">Operations manager · Demar Laser</span>
          </footer>
        </blockquote>
        <div className="mk-quote-stats">
          <div>
            <div className="mk-quote-stat">38<span>%</span></div>
            <div className="mk-quote-stat-l">fewer "what's next" calls to the planner</div>
          </div>
          <div>
            <div className="mk-quote-stat">14<span>d</span></div>
            <div className="mk-quote-stat-l">from kick-off to first job tracked on the floor</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Integrations — logo grid (placeholder cells, real names)
   ============================================================ */
function Integrations() {
  const items = [
    { name: 'Odoo MRP',  kind: 'Planning' },
    { name: 'FrePPLe',   kind: 'Planning' },
    { name: 'TRUMPF Oseon', kind: 'Machine' },
    { name: 'UMH / UNS', kind: 'Industrial' },
    { name: 'Supabase',  kind: 'Backend' },
    { name: 'PostgreSQL',kind: 'Database' },
    { name: 'MQTT',      kind: 'Protocol' },
    { name: 'Webhooks',  kind: 'Events' },
    { name: 'MCP',       kind: 'AI agents' },
    { name: 'Azumuta',   kind: 'Quality' },
    { name: 'Onshape',   kind: 'CAD' },
    { name: 'Three.js',  kind: 'STEP viewer' },
  ];
  return (
    <section className="mk-section" id="integrations">
      <div className="mk-section-head">
        <span className="mk-section-eyebrow">Integrations</span>
        <h2 className="mk-h2">Sits between the systems you already run.</h2>
        <p className="mk-section-lead">
          Eryxon Flow is the layer that takes job intent from your ERP, hands it to the floor as tablet-friendly operations, and pushes results back. Nothing on this list is a "coming soon" — every one ships in v0.5.1.
        </p>
      </div>
      <div className="mk-int-grid">
        {items.map(it => (
          <div key={it.name} className="mk-int-tile">
            <div className="mk-int-name">{it.name}</div>
            <div className="mk-int-kind">{it.kind}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   CTA banner — bottom CTA, dark band
   ============================================================ */
function CtaBanner() {
  return (
    <section className="mk-cta-banner">
      <div className="mk-cta-wrap">
        <div>
          <h2 className="mk-h2 on-dark">Try it on your own shop floor.</h2>
          <p className="mk-section-lead on-dark" style={{marginTop: 12}}>
            Free 30-day trial on the hosted version. Or pull the Docker image and self-host today.
          </p>
        </div>
        <div className="mk-cta-actions">
          <a href="#" className="mk-btn mk-btn-primary mk-btn-lg">Start free trial {M.arrow}</a>
          <a href="#" className="mk-btn mk-btn-on-dark mk-btn-lg">{M.github} Self-host guide</a>
        </div>
      </div>
    </section>
  );
}
