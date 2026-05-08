import { NavLink } from "react-router-dom";

export function PageHero({ eyebrow, title, children, actions = null }) {
  return (
    <section className="site-hero">
      <div className="site-hero-inner">
        {eyebrow ? <p className="site-kicker">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {children ? <div className="site-hero-copy">{children}</div> : null}
        {actions ? <div className="site-actions">{actions}</div> : null}
      </div>
    </section>
  );
}

export function SectionHeader({ eyebrow, title, children }) {
  return (
    <div className="site-section-header">
      {eyebrow ? <p className="site-kicker">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export function StatGrid({ stats }) {
  return (
    <div className="site-stat-grid">
      {stats.map((stat) => (
        <article className="site-stat" key={stat.label}>
          <span>{stat.label}</span>
          <strong>{stat.value}</strong>
          {stat.detail ? <small>{stat.detail}</small> : null}
        </article>
      ))}
    </div>
  );
}

export function StatusPage({ eyebrow, title, message, actionLabel = "Return home", to = "/" }) {
  return (
    <main className="site-status-page">
      <div className="site-status-panel">
        {eyebrow ? <p className="site-kicker">{eyebrow}</p> : null}
        <h1>{title}</h1>
        <p>{message}</p>
        <NavLink className="btn btn-primary" to={to}>{actionLabel}</NavLink>
      </div>
    </main>
  );
}
