import { useEffect, useMemo, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";
import {
  formatSessionDate,
  formatSessionDuration,
  formatSessionLocation,
  formatSessionPrice,
  getRegisteredUsers,
  getSessionImage,
  getSessionPricingLabel,
  getSessionStatusLabel,
  getSessionSummary,
  isPaidSession,
} from "../lib/sessions.js";

function RegisteredUserCard({ user }) {
  const name = user.name || "Registered user";
  const initial = name.trim() ? name.trim()[0].toUpperCase() : "U";

  return (
    <li className="session-user-card">
      {user.avatar ? (
        <img className="session-user-avatar" src={user.avatar} alt={name} loading="lazy" />
      ) : (
        <div className="session-user-avatar session-user-avatar-fallback">{initial}</div>
      )}
      <div>
        <h3>{name}</h3>
        <p>{user.id}</p>
      </div>
    </li>
  );
}

export default function SessionDetail() {
  const { id } = useParams();
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("Loading session...");

  useEffect(() => {
    if (!id) {
      setSession(null);
      setStatus("Session not found.");
      return;
    }

    let isActive = true;

    async function loadSession() {
      setStatus("Loading session...");
      try {
        const data = await apiRequest(`/v2/session/${encodeURIComponent(id)}`, { authRequired: false });
        if (!isActive) {
          return;
        }
        setSession(data);
        setStatus("");
      } catch (error) {
        if (!isActive) {
          return;
        }
        setSession(null);
        setStatus(error?.message || "Unable to load session right now.");
      }
    }

    loadSession();
    return () => {
      isActive = false;
    };
  }, [id]);

  const registeredUsers = useMemo(() => getRegisteredUsers(session), [session]);
  const rules = useMemo(
    () => (Array.isArray(session?.rules) ? session.rules.filter((rule) => String(rule || "").trim()) : []),
    [session],
  );
  const imageUrl = getSessionImage(session || {});
  const summary = getSessionSummary(session || {});
  const paid = isPaidSession(session || {});

  if (!session) {
    return (
      <section className="session-detail">
        <div className="event-detail-card">
          <NavLink className="event-back" to="/sessions">
            &larr; Back to Sessions
          </NavLink>
          <p className="search-status">{status}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="session-detail">
      <div className="event-detail-card">
        <NavLink className="event-back" to="/sessions">
          &larr; Back to Sessions
        </NavLink>

        <header className="event-detail-header">
          <p className="eyebrow">Session detail</p>
          <h1>{session.title || "Untitled session"}</h1>
          <p>{summary || "A long-running session hosted through BoxtoBox."}</p>
        </header>

        <div className="event-detail-layout">
          <div className="event-detail-poster">
            {imageUrl ? (
              <img className="event-poster-image" src={imageUrl} alt={session.title || "Session poster"} />
            ) : (
              <div className="event-poster-placeholder">
                {(session.title || "Session").trim()[0]?.toUpperCase() || "S"}
              </div>
            )}
          </div>

          <div className="event-detail-info">
            <div className="session-detail-status-card">
              <div className={`session-status-pill session-status-pill-large${session.registration_open ? " open" : ""}`}>
                {getSessionStatusLabel(session)}
              </div>
              <div className="session-price-row">
                <span className={`session-price-pill${paid ? " paid" : ""}`}>
                  {getSessionPricingLabel(session)}
                </span>
                <strong>{formatSessionPrice(session)}</strong>
              </div>
              <p>
                {session.registration_open
                  ? "Session is Open"
                  : "Session is currently closed, check back later"}
              </p>
            </div>

            <div className="event-detail-grid">
              <div className="event-detail-item">
                <p className="label">Starts</p>
                <p>{formatSessionDate(session.session_date)}</p>
              </div>
              <div className="event-detail-item">
                <p className="label">Location</p>
                <p>{formatSessionLocation(session)}</p>
              </div>
              <div className="event-detail-item">
                <p className="label">Host</p>
                <p>{session.host_name || "BoxtoBox host"}</p>
              </div>
              <div className="event-detail-item">
                <p className="label">Duration</p>
                <p>{formatSessionDuration(session.duration_hours)}</p>
              </div>
              <div className="event-detail-item">
                <p className="label">Remaining spots</p>
                <p>{session.remaining_places ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        <section className="event-detail-body">
          <details className="session-disclosure">
            <summary className="session-disclosure-summary">
              <div>
                <h2>About the session</h2>
                <p>Overview, format, and rules.</p>
              </div>
              <span className="session-disclosure-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="session-disclosure-content">
              <p>{session.overview || summary || "More session details will appear here soon."}</p>
              {session.format ? (
                <>
                  <h3>Format</h3>
                  <p>{session.format}</p>
                </>
              ) : null}
              {rules.length ? (
                <>
                  <h3>Rules</h3>
                  <ul>
                    {rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </details>
        </section>

        <section className="event-detail-body">
          <details className="session-disclosure">
            <summary className="session-disclosure-summary">
              <div>
                <h2>Registered users</h2>
                <p>See who is currently signed up.</p>
              </div>
              <div className="session-disclosure-meta">
                <span className="session-disclosure-toggle" aria-hidden="true">+</span>
              </div>
            </summary>
            <div className="session-disclosure-content">
              {registeredUsers.length ? (
                <ul className="session-users-grid">
                  {registeredUsers.map((user) => (
                    <RegisteredUserCard key={user.id} user={user} />
                  ))}
                </ul>
              ) : (
                <div className="session-users-empty">
                  <p>No one has registered for this session yet.</p>
                </div>
              )}
            </div>
          </details>
        </section>
      </div>
    </section>
  );
}
