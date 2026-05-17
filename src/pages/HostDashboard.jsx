import { useEffect, useMemo, useState } from "react";
import { signInWithEmail, signOut } from "../lib/auth.js";
import {
  clearStoredHostSession,
  fetchHostDashboard,
  getStoredHostSession,
  requestHostAuthCode,
  verifyHostAuthCode,
} from "../lib/hostDashboard.js";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "▦" },
  { id: "sessions", label: "Sessions", icon: "□" },
  { id: "events", label: "Events", icon: "◇" },
  { id: "customers", label: "Customers", icon: "○" },
];

function formatDate(value) {
  if (!value || value === "TBD") {
    return value || "TBD";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBD";
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

function LoginScreen({ onAuthenticated }) {
  const [step, setStep] = useState("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeId, setCodeId] = useState("");
  const [codeEmail, setCodeEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submitCredentials = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmail({ email, password });
      const result = await requestHostAuthCode();
      setCodeId(result.code_id);
      setCodeEmail(result.email || email);
      setStep("code");
    } catch (err) {
      const isForbidden = err?.status === 403;
      setError(isForbidden ? "Only verified hosts can access the host dashboard." : (err?.message || "Unable to sign in."));
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await verifyHostAuthCode({ codeId, code });
      onAuthenticated(session);
    } catch (err) {
      setError(err?.message || "Unable to verify this code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="host-login-screen">
      <section className="host-login-panel">
        <p className="host-dashboard-kicker">Host dashboard</p>
        <h1>Manage hosted events and sessions</h1>
        <p>Sign in with your BoxtoBox host account. Verified hosts receive a short email code before dashboard access.</p>

        {step === "credentials" ? (
          <form className="host-login-form" onSubmit={submitCredentials}>
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            </label>
            {error ? <div className="host-dashboard-error">{error}</div> : null}
            <button className="host-dashboard-button primary" type="submit" disabled={loading}>
              {loading ? "Checking..." : "Send code"}
            </button>
          </form>
        ) : (
          <form className="host-login-form" onSubmit={submitCode}>
            <p className="host-dashboard-note">Enter the 6-digit code sent to {codeEmail}.</p>
            <label>
              Code
              <input type="text" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} required />
            </label>
            {error ? <div className="host-dashboard-error">{error}</div> : null}
            <button className="host-dashboard-button primary" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Open dashboard"}
            </button>
            <button className="host-dashboard-button" type="button" onClick={() => setStep("credentials")} disabled={loading}>
              Use another account
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function Sidebar({ activeView, setActiveView, host, onLogout, onClearDetail }) {
  const changeView = (view) => {
    onClearDetail();
    setActiveView(view);
  };

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
            onClick={() => changeView(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="host-dashboard-user">
        <div>
          <strong>{host?.name || "Host"}</strong>
          <span>{host?.email || ""}</span>
        </div>
      </div>

      <div className="host-dashboard-logout">
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

function RevenueChart({ days = [], currency = "NGN" }) {
  const max = Math.max(...days.map((day) => Number(day.amount || 0)), 0);

  return (
    <section className="host-dashboard-section">
      <div className="host-dashboard-section-header">
        <h2>Payments per day</h2>
        <span>{days.length} days</span>
      </div>
      {days.length ? (
        <div className="host-revenue-chart">
          {days.map((day) => {
            const amount = Number(day.amount || 0);
            const height = max > 0 ? Math.max((amount / max) * 100, 8) : 8;
            return (
              <article className="host-revenue-bar" key={day.date}>
                <div className="host-revenue-track">
                  <span style={{ height: `${height}%` }} />
                </div>
                <strong>{formatMoney(amount, currency)}</strong>
                <small>{day.date}</small>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="host-dashboard-empty">No paid transactions yet</div>
      )}
    </section>
  );
}

function Overview({ overview }) {
  return (
    <>
      <section className="host-dashboard-metrics">
        <Metric label="Hosted content" value={overview?.total_hosted_content || 0} detail="Events and sessions" />
        <Metric label="Total revenue" value={formatMoney(overview?.total_revenue, overview?.currency)} detail="Paid registrations and memberships" />
      </section>
      <RevenueChart days={overview?.revenue_by_day || []} currency={overview?.currency} />
    </>
  );
}

function ContentTable({ items, title, type, onSelect }) {
  return (
    <section className="host-dashboard-section">
      <div className="host-dashboard-section-header">
        <h2>{title}</h2>
        <span>{items.length} total</span>
      </div>
      {items.length ? (
        <div className="host-content-list">
          {items.map((item) => (
            <button className="host-content-row" key={`${item.content_type}-${item.id}`} type="button" onClick={() => onSelect(item)}>
              <div>
                <span className={`host-status ${type === "sessions" ? (item.is_active ? "live" : "archived") : item.status}`}>
                  {type === "sessions" ? (item.is_active ? "active" : "inactive") : statusLabel(item.status)}
                </span>
                <h3>{item.title || "Untitled"}</h3>
                <p>{locationText(item.location)}</p>
              </div>
              <dl>
                <div>
                  <dt>{type === "sessions" ? "Starts" : "Start"}</dt>
                  <dd>{type === "sessions" ? formatDate(item.starts_display) : formatDate(item.starts_at)}</dd>
                </div>
                <div>
                  <dt>Registered</dt>
                  <dd>{type === "sessions" ? item.registered_display : `${item.registered_count || 0}/${item.capacity || 0}`}</dd>
                </div>
                <div>
                  <dt>{type === "sessions" ? "Membership" : "Registration fee"}</dt>
                  <dd>{type === "sessions" ? item.membership_display : formatMoney(item.registration_fee, item.currency)}</dd>
                </div>
                {type === "sessions" ? (
                  <div>
                    <dt>Registration fee</dt>
                    <dd>{formatMoney(item.registration_fee, item.currency)}</dd>
                  </div>
                ) : null}
              </dl>
            </button>
          ))}
        </div>
      ) : (
        <div className="host-dashboard-empty">No hosted {title.toLowerCase()} yet</div>
      )}
    </section>
  );
}

function ContentDetail({ item, onBack }) {
  return (
    <section className="host-dashboard-section">
      <button className="host-dashboard-button" type="button" onClick={onBack}>Back</button>
      <div className="host-detail-panel">
        <div>
          <p className="host-dashboard-kicker">{item.content_type}</p>
          <h2>{item.title || "Untitled"}</h2>
          <p>{locationText(item.location)}</p>
        </div>
        <div className="host-detail-grid">
          <Metric label="Total revenue" value={formatMoney(item.total_revenue, item.currency)} detail="Paid transactions" />
          <Metric label="Registered users" value={item.registered_count || 0} detail={`${item.capacity || 0} capacity`} />
          <Metric label="Registration fee" value={formatMoney(item.registration_fee, item.currency)} detail={item.content_type === "session" ? item.membership_display : "Event entry"} />
        </div>
        <div className="host-tools-panel">
          <p className="host-dashboard-kicker">Host tools</p>
          <h3>Coming soon</h3>
          <p>Tools for managing this {item.content_type} will be added here later.</p>
        </div>
      </div>
    </section>
  );
}

function Customers() {
  return (
    <section className="host-dashboard-section">
      <div className="host-dashboard-section-header">
        <h2>Customers</h2>
        <span>Coming soon</span>
      </div>
      <div className="host-dashboard-empty">Customer tools are coming soon</div>
    </section>
  );
}

export default function HostDashboard() {
  const [session, setSession] = useState(() => getStoredHostSession());
  const [activeView, setActiveView] = useState("overview");
  const [selectedItem, setSelectedItem] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!session?.token) {
      return undefined;
    }
    setLoading(true);
    setError("");
    fetchHostDashboard(session)
      .then((payload) => {
        if (active) {
          setDashboard(payload);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err?.message || "Unable to load host dashboard.");
          if (err?.status === 401 || err?.status === 403) {
            clearStoredHostSession();
            setSession(null);
          }
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
  }, [session]);

  const host = dashboard?.host || session?.host;
  const sessions = useMemo(() => dashboard?.sessions || [], [dashboard]);
  const events = useMemo(() => dashboard?.events || [], [dashboard]);

  const logout = async () => {
    clearStoredHostSession();
    setSession(null);
    setDashboard(null);
    setSelectedItem(null);
    try {
      await signOut();
    } catch (error) {
      // Firebase sign-out failure should not keep the local dashboard session open.
    }
  };

  if (!session?.token) {
    return <LoginScreen onAuthenticated={setSession} />;
  }

  const title = selectedItem ? selectedItem.title : NAV_ITEMS.find((item) => item.id === activeView)?.label;

  return (
    <div className="host-dashboard-shell">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        host={host}
        onLogout={logout}
        onClearDetail={() => setSelectedItem(null)}
      />
      <main className="host-dashboard-main">
        <header className="host-dashboard-header">
          <div>
            <p className="host-dashboard-kicker">Host workspace</p>
            <h1>{title}</h1>
          </div>
          <span className="host-dashboard-mode">Verified host</span>
        </header>

        {loading ? <div className="host-dashboard-empty">Loading host data</div> : null}
        {error ? <div className="host-dashboard-empty">{error}</div> : null}

        {!loading && !error && selectedItem ? <ContentDetail item={selectedItem} onBack={() => setSelectedItem(null)} /> : null}
        {!loading && !error && !selectedItem && activeView === "overview" ? <Overview overview={dashboard?.overview} /> : null}
        {!loading && !error && !selectedItem && activeView === "sessions" ? (
          <ContentTable items={sessions} title="Sessions" type="sessions" onSelect={setSelectedItem} />
        ) : null}
        {!loading && !error && !selectedItem && activeView === "events" ? (
          <ContentTable items={events} title="Events" type="events" onSelect={setSelectedItem} />
        ) : null}
        {!loading && !error && !selectedItem && activeView === "customers" ? <Customers /> : null}
      </main>
    </div>
  );
}
