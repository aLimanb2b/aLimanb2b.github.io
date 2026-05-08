import { useEffect, useMemo, useState } from "react";
import {
  clearMockHost,
  fetchHostDashboard,
  getMockHost,
  setMockHost,
} from "../lib/hostDashboard.js";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "sessions", label: "Sessions", icon: "□" },
  { id: "events", label: "Events", icon: "◇" },
  { id: "customers", label: "Customers", icon: "○" },
];

const MOCK_HOST = {
  id: "mock-host-1",
  name: "Mock Host",
  email: "host@boxtobox.test",
};

function formatDate(value) {
  if (!value) {
    return "Not set";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(value, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function locationText(location) {
  return [location?.address_name, location?.city, location?.country].filter(Boolean).join(", ") || "Location not set";
}

function statusLabel(status) {
  return String(status || "unknown").replace(/_/g, " ");
}

function uniqueAttendees(items) {
  const attendees = new Map();
  items.forEach((item) => {
    (item.attendees || []).forEach((attendee) => {
      if (!attendees.has(attendee.id)) {
        attendees.set(attendee.id, {
          ...attendee,
          content_count: 0,
          paid_count: 0,
          pending_count: 0,
        });
      }
      const current = attendees.get(attendee.id);
      current.content_count += 1;
      if (attendee.payment_status === "paid") {
        current.paid_count += 1;
      }
      if (attendee.payment_status === "pending") {
        current.pending_count += 1;
      }
    });
  });
  return Array.from(attendees.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function LoginScreen({ onLogin }) {
  return (
    <main className="host-login-screen">
      <section className="host-login-panel">
        <p className="host-dashboard-kicker">Host dashboard</p>
        <h1>Manage hosted events and sessions</h1>
        <p>Use a mock host account while Firebase dashboard authentication is being wired to the production host API.</p>
        <button className="host-dashboard-button primary" type="button" onClick={onLogin}>
          Continue as mock host
        </button>
      </section>
    </main>
  );
}

function Sidebar({ activeView, setActiveView, host, onLogout }) {
  return (
    <aside className="host-dashboard-sidebar">
      <div className="host-dashboard-brand">
        <span>BoxtoBox</span>
        <strong>Dashboard</strong>
      </div>

      <nav className="host-dashboard-nav" aria-label="Host dashboard">
        {NAV_ITEMS.map((item) => (
          <button
            className={`host-dashboard-nav-item${activeView === item.id ? " active" : ""}`}
            key={item.id}
            type="button"
            onClick={() => setActiveView(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="host-dashboard-user">
        <div>
          <strong>{host.name}</strong>
          <span>{host.email}</span>
        </div>
        <button type="button" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  );
}

function Metric({ label, value, detail }) {
  return (
    <article className="host-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

function ContentTable({ items, title }) {
  return (
    <section className="host-dashboard-section">
      <div className="host-dashboard-section-header">
        <h2>{title}</h2>
        <span>{items.length} total</span>
      </div>
      <div className="host-content-list">
        {items.map((item) => (
          <article className="host-content-row" key={`${item.content_type}-${item.id}`}>
            <div>
              <span className={`host-status ${item.status}`}>{statusLabel(item.status)}</span>
              <h3>{item.title}</h3>
              <p>{locationText(item.location)}</p>
            </div>
            <dl>
              <div>
                <dt>Starts</dt>
                <dd>{formatDate(item.starts_at)}</dd>
              </div>
              <div>
                <dt>Registered</dt>
                <dd>{item.registered_count}/{item.capacity}</dd>
              </div>
              <div>
                <dt>Revenue</dt>
                <dd>{formatMoney(item.payment_summary?.gross_paid_amount, item.currency)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function Overview({ items }) {
  const totals = useMemo(() => {
    return items.reduce((acc, item) => {
      acc.registered += Number(item.registered_count || 0);
      acc.remaining += Number(item.remaining_count || 0);
      acc.revenue += Number(item.payment_summary?.gross_paid_amount || 0);
      acc.pending += Number(item.payment_summary?.pending_count || 0);
      return acc;
    }, { registered: 0, remaining: 0, revenue: 0, pending: 0 });
  }, [items]);

  return (
    <>
      <section className="host-dashboard-metrics">
        <Metric label="Hosted content" value={items.length} detail="Events and sessions" />
        <Metric label="Registered players" value={totals.registered} detail={`${totals.remaining} open spots`} />
        <Metric label="Paid revenue" value={formatMoney(totals.revenue)} detail={`${totals.pending} pending payments`} />
      </section>
      <ContentTable items={items.slice(0, 4)} title="Recent hosted content" />
    </>
  );
}

function Customers({ items }) {
  const attendees = uniqueAttendees(items);
  return (
    <section className="host-dashboard-section">
      <div className="host-dashboard-section-header">
        <h2>Customers</h2>
        <span>{attendees.length} unique</span>
      </div>
      <div className="host-attendee-table">
        {attendees.map((attendee) => (
          <article key={attendee.id}>
            <div>
              <strong>{attendee.name}</strong>
              <span>{attendee.email}</span>
            </div>
            <span>{attendee.content_count} bookings</span>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function HostDashboard() {
  const [host, setHost] = useState(() => getMockHost());
  const [activeView, setActiveView] = useState("overview");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!host) {
      return undefined;
    }
    setLoading(true);
    fetchHostDashboard()
      .then((payload) => {
        if (active) {
          setDashboard(payload);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [host]);

  const items = dashboard?.results || [];
  const sessions = items.filter((item) => item.content_type === "session");
  const events = items.filter((item) => item.content_type === "event");

  const login = () => {
    setMockHost(MOCK_HOST);
    setHost(MOCK_HOST);
  };

  const logout = () => {
    clearMockHost();
    setHost(null);
    setDashboard(null);
  };

  if (!host) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="host-dashboard-shell">
      <Sidebar activeView={activeView} setActiveView={setActiveView} host={host} onLogout={logout} />
      <main className="host-dashboard-main">
        <header className="host-dashboard-header">
          <div>
            <p className="host-dashboard-kicker">Host workspace</p>
            <h1>{NAV_ITEMS.find((item) => item.id === activeView)?.label}</h1>
          </div>
          <span className="host-dashboard-mode">Mock login</span>
        </header>

        {loading ? (
          <div className="host-dashboard-empty">Loading host data</div>
        ) : null}

        {!loading && activeView === "overview" ? <Overview items={items} /> : null}
        {!loading && activeView === "sessions" ? <ContentTable items={sessions} title="Sessions" /> : null}
        {!loading && activeView === "events" ? <ContentTable items={events} title="Events" /> : null}
        {!loading && activeView === "customers" ? <Customers items={items} /> : null}
      </main>
    </div>
  );
}
