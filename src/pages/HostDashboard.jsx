import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api.js";
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

function getReservationLabel(user) {
  return String(user?.registration_status || "").toLowerCase() === "reserved" ? "Reserved" : "Registered";
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

function HostAttendeeCard({ attendee, actionLabel = "", actionDisabled = false, onAction = null }) {
  const name = attendee.name || "Registered user";
  const initial = name.trim() ? name.trim()[0].toUpperCase() : "U";
  const isReserved = String(attendee?.registration_status || "").toLowerCase() === "reserved";

  return (
    <li className="host-reserved-user-card">
      <div className="host-reserved-avatar">{initial}</div>
      <div className="host-reserved-copy">
        <h4>{name}</h4>
        <p>{attendee.email || attendee.id}</p>
        <div className="host-reserved-meta">
          <span className={`session-user-status${isReserved ? " reserved" : ""}`}>
            {getReservationLabel(attendee)}
          </span>
          {onAction ? (
            <button
              className="host-dashboard-button"
              type="button"
              disabled={actionDisabled}
              onClick={onAction}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function MaterialIcon({ name }) {
  return (
    <span className="material-symbols-outlined host-tool-icon" aria-hidden="true">
      {name}
    </span>
  );
}

function normalizeToolText(value) {
  return String(value || "").trim().toLowerCase();
}

function isFootballSession(item) {
  return normalizeToolText(item?.sport) === "football";
}

function isDoublesTennisSession(item) {
  return normalizeToolText(item?.sport) === "tennis" && normalizeToolText(item?.category_type) === "doubles";
}

function toDateTimeLocalValue(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function suggestedFreshStartValue(item) {
  const start = new Date(item?.starts_at || Date.now());
  const base = Number.isNaN(start.getTime()) ? new Date() : start;
  base.setDate(base.getDate() + 7);
  return toDateTimeLocalValue(base);
}

function freshStartDeadlineIso(startValue) {
  const startDate = new Date(startValue);
  if (Number.isNaN(startDate.getTime())) {
    return "";
  }
  const deadline = new Date(startDate);
  deadline.setDate(deadline.getDate() - 1);
  deadline.setHours(23, 59, 0, 0);
  return deadline.toISOString();
}

function displayParticipantName(player) {
  return player?.name || player?.account_id || player?.id || "Registered player";
}

function submittedStatsRows(board) {
  const priority = { pending: 0, rejected: 1, confirmed: 2 };
  return [...(board?.leaderboard || [])]
    .filter((row) => row?.submitted_at)
    .sort((left, right) => {
      const leftPriority = priority[normalizeToolText(left.status)] ?? 3;
      const rightPriority = priority[normalizeToolText(right.status)] ?? 3;
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }
      return displayParticipantName(left).localeCompare(displayParticipantName(right), undefined, { sensitivity: "base" });
    });
}

function registeredDoublesPlayers(item) {
  return [...(item.attendees || [])]
    .filter((attendee) => normalizeToolText(attendee.registration_status || "registered") === "registered")
    .sort((left, right) => displayParticipantName(left).localeCompare(displayParticipantName(right), undefined, { sensitivity: "base" }));
}

function buildDoublesAssignments(players) {
  const teams = [];
  for (let index = 0; index + 1 < players.length; index += 2) {
    teams.push({
      number: teams.length + 1,
      players: [
        { id: players[index].id, name: displayParticipantName(players[index]) },
        { id: players[index + 1].id, name: displayParticipantName(players[index + 1]) },
      ],
    });
  }
  const unpaired = players.length % 2 === 1 ? players[players.length - 1] : null;
  return {
    teams,
    unpaired_user: unpaired ? { id: unpaired.id, name: displayParticipantName(unpaired) } : null,
  };
}

function SessionHostTools({ item, onRefresh }) {
  const [activeTool, setActiveTool] = useState(null);
  const [targetAccountId, setTargetAccountId] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [freshStartDate, setFreshStartDate] = useState(() => suggestedFreshStartValue(item));
  const [freshCapacity, setFreshCapacity] = useState("");
  const [freshLoading, setFreshLoading] = useState(false);
  const [freshError, setFreshError] = useState("");
  const [freshMessage, setFreshMessage] = useState("");
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveError, setReserveError] = useState("");
  const [reserveMessage, setReserveMessage] = useState("");
  const [cancelLoadingId, setCancelLoadingId] = useState("");
  const [statsBoard, setStatsBoard] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [statsMessage, setStatsMessage] = useState("");
  const [statActionLoadingId, setStatActionLoadingId] = useState("");
  const [doublesLoading, setDoublesLoading] = useState(false);
  const [doublesError, setDoublesError] = useState("");
  const [doublesMessage, setDoublesMessage] = useState("");

  const reservedUsers = useMemo(
    () => (item.attendees || []).filter((attendee) => String(attendee?.registration_status || "").toLowerCase() === "reserved"),
    [item.attendees],
  );
  const doublesPlayers = useMemo(() => registeredDoublesPlayers(item), [item.attendees]);
  const doublesAssignments = useMemo(() => buildDoublesAssignments(doublesPlayers), [doublesPlayers]);
  const statsRows = useMemo(() => submittedStatsRows(statsBoard), [statsBoard]);
  const itemStatus = normalizeToolText(item.status);
  const canStartFresh = !item.deleted_at && !item.archived_at && itemStatus !== "archived";
  const canReserveSpot = item.deleted_at || item.archived_at || itemStatus === "completed"
    ? false
    : Number(item.remaining_count ?? 0) > 0;
  const canReviewStats = isFootballSession(item) && item.stats_open;
  const canSplitDoublesTeams = isDoublesTennisSession(item) && doublesPlayers.length >= 2;
  const canVerifyAttendee = item.verification_required === true;
  const tools = [
    {
      id: "start-fresh",
      title: "Start Fresh Week",
      description: canStartFresh ? "Open the next weekly occurrence." : "Unavailable for archived sessions.",
      iconName: "play_circle",
      disabled: !canStartFresh,
    },
    {
      id: "review-stats",
      title: "Review Session Stats",
      description: canReviewStats ? "Confirm or reject submitted stats." : "Available when football stats are open.",
      iconName: "assignment",
      disabled: !canReviewStats,
    },
    {
      id: "reserve",
      title: "Reserve A Spot",
      description: canReserveSpot ? "Create a named reserved spot." : "No reservable spots right now.",
      iconName: "group_add",
      disabled: !canReserveSpot,
    },
    {
      id: "split-doubles",
      title: "Split Doubles Teams",
      description: canSplitDoublesTeams ? "Generate and confirm doubles teams." : "Tennis doubles sessions need at least 2 players.",
      iconName: "groups",
      disabled: !canSplitDoublesTeams,
    },
    {
      id: "verify-attendee",
      title: "Verify Attendee",
      description: canVerifyAttendee ? "Only available on mobile." : "Verification is not required. Only available on mobile.",
      iconName: "qr_code_scanner",
      disabled: true,
    },
    {
      id: "cancel-reserved",
      title: "Cancel Reserved Spot",
      description: reservedUsers.length ? `${reservedUsers.length} reserved` : "No reserved spots.",
      iconName: "person_remove",
      disabled: reservedUsers.length === 0,
    },
  ];

  useEffect(() => {
    setFreshStartDate(suggestedFreshStartValue(item));
    setFreshCapacity("");
    setFreshError("");
    setFreshMessage("");
    setStatsBoard(null);
    setStatsError("");
    setStatsMessage("");
    setDoublesError("");
    setDoublesMessage("");
  }, [item.id]);

  async function loadSessionStats() {
    setStatsLoading(true);
    setStatsError("");
    try {
      const data = await apiRequest(`/v2/session/${encodeURIComponent(item.id)}/stats`, {
        query: { account_id: item.host_id },
      });
      setStatsBoard(data || null);
      return data || null;
    } catch (error) {
      setStatsError(error?.message || "Unable to load session stats right now.");
      return null;
    } finally {
      setStatsLoading(false);
    }
  }

  const openTool = (toolId) => {
    const tool = tools.find((candidate) => candidate.id === toolId);
    if (!tool || tool.disabled) {
      return;
    }
    setActiveTool(toolId);
    setFreshError("");
    setFreshMessage("");
    setReserveError("");
    setReserveMessage("");
    setStatsError("");
    setStatsMessage("");
    setDoublesError("");
    setDoublesMessage("");
    if (toolId === "review-stats") {
      loadSessionStats();
    }
  };

  const closeTool = () => {
    if (freshLoading || reserveLoading || cancelLoadingId || statsLoading || statActionLoadingId || doublesLoading) {
      return;
    }
    setActiveTool(null);
  };

  const startFreshWeek = async (event) => {
    event.preventDefault();
    setFreshError("");
    setFreshMessage("");
    const deadline = freshStartDeadlineIso(freshStartDate);
    if (!freshStartDate || !deadline) {
      setFreshError("Choose a valid start date.");
      return;
    }
    const capacity = freshCapacity.trim();
    if (capacity && (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0)) {
      setFreshError("Capacity must be a whole number greater than 0.");
      return;
    }
    if (!capacity && Number(item.default_available_places || 0) <= 0) {
      setFreshError("Capacity is required because this session has no default capacity.");
      return;
    }

    try {
      setFreshLoading(true);
      await apiRequest(`/v2/session/${encodeURIComponent(item.id)}/start-fresh`, {
        method: "POST",
        body: {
          host_id: item.host_id,
          session_date: new Date(freshStartDate).toISOString(),
          registration_deadline: deadline,
          ...(capacity ? { available_places: Number(capacity) } : {}),
        },
      });
      await onRefresh(item);
      setFreshMessage("Session opened for the new week.");
    } catch (error) {
      setFreshError(error?.message || "Unable to start a fresh week right now.");
    } finally {
      setFreshLoading(false);
    }
  };

  const reserveUser = async (event) => {
    event.preventDefault();
    setReserveError("");
    setReserveMessage("");
    const accountId = targetAccountId.trim();
    const email = targetEmail.trim();
    if ((accountId && email) || (!accountId && !email)) {
      setReserveError("Enter either an account ID or an existing email.");
      return;
    }

    try {
      setReserveLoading(true);
      await apiRequest(`/v2/session/${encodeURIComponent(item.id)}/registration/reserve-user`, {
        method: "POST",
        body: {
          host_id: item.host_id,
          ...(accountId ? { account_id: accountId } : { email }),
        },
      });
      await onRefresh(item);
      setTargetAccountId("");
      setTargetEmail("");
      setReserveMessage("Reserved spot saved.");
    } catch (error) {
      setReserveError(error?.message || "Unable to reserve a spot right now.");
    } finally {
      setReserveLoading(false);
    }
  };

  const cancelReservedUser = async (accountId) => {
    setReserveError("");
    setReserveMessage("");
    if (!accountId) {
      return;
    }

    try {
      setCancelLoadingId(accountId);
      await apiRequest(`/v2/session/${encodeURIComponent(item.id)}/registration/cancel-reserved-user`, {
        method: "POST",
        body: {
          host_id: item.host_id,
          account_id: accountId,
        },
      });
      await onRefresh(item);
      setReserveMessage("Reserved spot cancelled.");
    } catch (error) {
      setReserveError(error?.message || "Unable to cancel the reserved spot right now.");
    } finally {
      setCancelLoadingId("");
    }
  };

  const reviewStat = async (stat, status) => {
    const accountId = stat?.account_id;
    if (!accountId) {
      return;
    }
    setStatsError("");
    setStatsMessage("");
    try {
      setStatActionLoadingId(`${accountId}:${status}`);
      await apiRequest(`/v2/session/${encodeURIComponent(item.id)}/stats/${encodeURIComponent(accountId)}/confirm`, {
        method: "POST",
        body: {
          host_id: item.host_id,
          goals: stat.goals || 0,
          assists: stat.assists || 0,
          clean_sheets: stat.clean_sheets || 0,
          status,
        },
      });
      await loadSessionStats();
      setStatsMessage(status === "confirmed" ? "Stats confirmed." : "Stats rejected.");
    } catch (error) {
      setStatsError(error?.message || "Unable to update these stats right now.");
    } finally {
      setStatActionLoadingId("");
    }
  };

  const confirmDoublesTeams = async () => {
    setDoublesError("");
    setDoublesMessage("");
    if (!doublesAssignments.teams.length) {
      setDoublesError("Create at least one doubles team before confirming.");
      return;
    }

    try {
      setDoublesLoading(true);
      await apiRequest(`/v2/session/${encodeURIComponent(item.id)}/doubles-teams/confirm`, {
        method: "POST",
        body: {
          host_id: item.host_id,
          teams: doublesAssignments.teams,
          unpaired_user: doublesAssignments.unpaired_user,
        },
      });
      setDoublesMessage("Doubles teams confirmed.");
    } catch (error) {
      setDoublesError(error?.message || "Unable to confirm doubles teams right now.");
    } finally {
      setDoublesLoading(false);
    }
  };

  const modalTitle = activeTool
    ? tools.find((tool) => tool.id === activeTool)?.title || "Host Tool"
    : "";

  return (
    <div className="host-tools-panel">
      <div>
        <p className="host-dashboard-kicker">Host tools</p>
        <h3>Choose a host action</h3>
      </div>

      <div className="host-tools-grid">
        {tools.map((tool) => (
          <button
            className={`host-tool-tile${tool.disabled ? " disabled" : ""}`}
            type="button"
            key={tool.id}
            disabled={tool.disabled}
            aria-disabled={tool.disabled}
            onClick={() => openTool(tool.id)}
          >
            <span className="host-tool-icon-shell">
              <MaterialIcon name={tool.iconName} />
            </span>
            <span className="host-tool-title">{tool.title}</span>
            <span className="host-tool-description">{tool.description}</span>
          </button>
        ))}
      </div>

      {activeTool ? (
        <div className="host-tool-modal-overlay" role="presentation" onClick={closeTool}>
          <div
            className="host-tool-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="host-tool-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="host-tool-modal-header">
              <div>
                <p className="host-dashboard-kicker">Host tool</p>
                <h3 id="host-tool-modal-title">{modalTitle}</h3>
              </div>
              <button
                className="host-tool-modal-close"
                type="button"
                aria-label="Close host tool"
                disabled={freshLoading || reserveLoading || Boolean(cancelLoadingId) || statsLoading || Boolean(statActionLoadingId) || doublesLoading}
                onClick={closeTool}
              >
                x
              </button>
            </div>

            {activeTool === "start-fresh" ? (
              <form className="host-tool-modal-body" onSubmit={startFreshWeek}>
                <p>Choose the next session start time. The registration deadline will be set to 11:59 PM on the previous day.</p>
                <label className="payment-field">
                  Start date and time
                  <input
                    type="datetime-local"
                    value={freshStartDate}
                    onChange={(event) => setFreshStartDate(event.target.value)}
                    required
                  />
                </label>
                <label className="payment-field">
                  Capacity override
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={freshCapacity}
                    placeholder={item.default_available_places > 0 ? String(item.default_available_places) : "Required if no default capacity"}
                    onChange={(event) => setFreshCapacity(event.target.value)}
                  />
                </label>
                {freshError ? <p className="host-dashboard-error">{freshError}</p> : null}
                {freshMessage ? <p className="host-dashboard-note">{freshMessage}</p> : null}
                <button
                  className="host-dashboard-button primary"
                  type="submit"
                  disabled={freshLoading}
                >
                  {freshLoading ? "Starting..." : "Start fresh week"}
                </button>
              </form>
            ) : null}

            {activeTool === "review-stats" ? (
              <div className="host-tool-modal-body">
                <div className="host-tool-modal-actions">
                  <p>Review submitted football stats for this session occurrence.</p>
                  <button
                    className="host-dashboard-button"
                    type="button"
                    disabled={statsLoading || Boolean(statActionLoadingId)}
                    onClick={loadSessionStats}
                  >
                    {statsLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>
                {statsError ? <p className="host-dashboard-error">{statsError}</p> : null}
                {statsMessage ? <p className="host-dashboard-note">{statsMessage}</p> : null}
                {statsLoading && !statsBoard ? <div className="host-tools-empty">Loading stats</div> : null}
                {!statsLoading && statsBoard && !statsRows.length ? (
                  <div className="host-tools-empty">No submitted football stats yet</div>
                ) : null}
                {statsRows.length ? (
                  <div className="host-stats-review-list">
                    {statsRows.map((stat) => {
                      const status = normalizeToolText(stat.status);
                      const isPending = status === "pending";
                      return (
                        <article className="host-stats-review-row" key={stat.account_id}>
                          <div>
                            <h4>{displayParticipantName(stat)}</h4>
                            <p>{stat.goals || 0} goals, {stat.assists || 0} assists, {stat.clean_sheets || 0} clean sheets</p>
                            <span className={`host-tool-status ${status}`}>{status || "pending"}</span>
                          </div>
                          <div className="host-stats-review-actions">
                            <button
                              className="host-dashboard-button"
                              type="button"
                              disabled={!isPending || Boolean(statActionLoadingId)}
                              onClick={() => reviewStat(stat, "confirmed")}
                            >
                              {statActionLoadingId === `${stat.account_id}:confirmed` ? "Confirming..." : "Confirm"}
                            </button>
                            <button
                              className="host-dashboard-button"
                              type="button"
                              disabled={!isPending || Boolean(statActionLoadingId)}
                              onClick={() => reviewStat(stat, "rejected")}
                            >
                              {statActionLoadingId === `${stat.account_id}:rejected` ? "Rejecting..." : "Reject"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}

            {activeTool === "reserve" ? (
              <form className="host-tool-modal-body" onSubmit={reserveUser}>
                <p>Use an existing account ID or email. Enter only one.</p>
                <div className="host-reserve-form">
                  <label className="payment-field">
                    Account ID
                    <input
                      type="text"
                      value={targetAccountId}
                      placeholder="user-123"
                      onChange={(event) => setTargetAccountId(event.target.value)}
                    />
                  </label>
                  <label className="payment-field">
                    Existing Email
                    <input
                      type="email"
                      value={targetEmail}
                      placeholder="player@example.com"
                      onChange={(event) => setTargetEmail(event.target.value)}
                    />
                  </label>
                </div>
                <p>Named reservations immediately occupy a session spot and show publicly as reserved until claimed.</p>
                {reserveError ? <p className="host-dashboard-error">{reserveError}</p> : null}
                {reserveMessage ? <p className="host-dashboard-note">{reserveMessage}</p> : null}
                <button
                  className="host-dashboard-button primary"
                  type="submit"
                  disabled={reserveLoading}
                >
                  {reserveLoading ? "Saving..." : "Reserve spot"}
                </button>
              </form>
            ) : null}

            {activeTool === "split-doubles" ? (
              <div className="host-tool-modal-body">
                <p>Teams are generated from registered players in name order. Reserved users are not included.</p>
                {doublesError ? <p className="host-dashboard-error">{doublesError}</p> : null}
                {doublesMessage ? <p className="host-dashboard-note">{doublesMessage}</p> : null}
                <div className="host-doubles-team-list">
                  {doublesAssignments.teams.map((team) => (
                    <article className="host-doubles-team" key={team.number}>
                      <span>Team {team.number}</span>
                      <strong>{team.players.map((player) => player.name).join(" + ")}</strong>
                    </article>
                  ))}
                  {doublesAssignments.unpaired_user ? (
                    <article className="host-doubles-team unpaired">
                      <span>Unpaired</span>
                      <strong>{doublesAssignments.unpaired_user.name}</strong>
                    </article>
                  ) : null}
                </div>
                <button
                  className="host-dashboard-button primary"
                  type="button"
                  disabled={doublesLoading}
                  onClick={confirmDoublesTeams}
                >
                  {doublesLoading ? "Confirming..." : "Confirm doubles teams"}
                </button>
              </div>
            ) : null}

            {activeTool === "cancel-reserved" ? (
              <div className="host-tool-modal-body">
                <p>Cancel unclaimed reserved spots when needed.</p>
                {reserveError ? <p className="host-dashboard-error">{reserveError}</p> : null}
                {reserveMessage ? <p className="host-dashboard-note">{reserveMessage}</p> : null}
                {reservedUsers.length ? (
                  <ul className="host-reserved-users">
                    {reservedUsers.map((attendee) => (
                      <HostAttendeeCard
                        key={attendee.id}
                        attendee={attendee}
                        actionLabel={cancelLoadingId === attendee.id ? "Cancelling..." : "Cancel"}
                        actionDisabled={Boolean(cancelLoadingId)}
                        onAction={() => cancelReservedUser(attendee.id)}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className="host-tools-empty">No reserved users yet</div>
                )}
              </div>
            ) : null}

          </div>
        </div>
      ) : null}
    </div>
  );
}

function ContentDetail({ item, onBack, onRefresh }) {
  const membershipFeeValue = item.content_type === "session" && item.membership_required
    ? formatMoney(item.membership_fee, item.membership_currency || item.currency)
    : "N/A";
  const membershipFeeDetail = item.content_type === "session" && item.membership_required
    ? (item.membership_period_days > 0 ? `${item.membership_period_days} days` : "Membership required")
    : "No membership fee";

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
          <Metric label="Registration fee" value={formatMoney(item.registration_fee, item.currency)} detail={item.content_type === "session" ? "Session entry" : "Event entry"} />
          {item.content_type === "session" ? (
            <Metric label="Membership fee" value={membershipFeeValue} detail={membershipFeeDetail} />
          ) : null}
        </div>
        {item.content_type === "session" ? (
          <SessionHostTools item={item} onRefresh={onRefresh} />
        ) : (
          <div className="host-tools-panel">
            <p className="host-dashboard-kicker">Host tools</p>
            <h3>Coming soon</h3>
            <p>Tools for managing this {item.content_type} will be added here later.</p>
          </div>
        )}
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

  const refreshSelectedItem = async (item) => {
    const payload = await fetchHostDashboard(session);
    setDashboard(payload);
    const collection = item.content_type === "session" ? payload?.sessions || [] : payload?.events || [];
    const nextItem = collection.find((candidate) => candidate.id === item.id) || item;
    setSelectedItem(nextItem);
    return nextItem;
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

        {!loading && !error && selectedItem ? (
          <ContentDetail item={selectedItem} onBack={() => setSelectedItem(null)} onRefresh={refreshSelectedItem} />
        ) : null}
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
