import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { apiRequest } from "../lib/api.js";
import {
  formatSessionDate,
  formatSessionDeadline,
  formatSessionDuration,
  formatSessionLocation,
  formatSessionPrice,
  getSessionImage,
  getSessionPricingLabel,
  getSessionSummary,
  isPaidSession,
} from "../lib/sessions.js";

function SessionCard({ session }) {
  const imageUrl = getSessionImage(session);
  const summary = getSessionSummary(session);
  const label = (session.title || "Session").trim();
  const paid = isPaidSession(session);

  return (
    <NavLink
      className="session-card"
      to={`/session/${encodeURIComponent(session.id)}`}
      aria-label={`View ${session.title || "session"} details`}
    >
      <div className="session-card-media">
        {imageUrl ? (
          <img src={imageUrl} alt={session.title || "Session image"} loading="lazy" />
        ) : (
          <div className="session-card-placeholder">{label ? label[0].toUpperCase() : "S"}</div>
        )}
      </div>
      <div className="session-card-body">
        <div className="session-card-head">
          <h3>{session.title || "Untitled session"}</h3>
          <span className="session-card-spots">
            {session.remaining_places ?? 0} spots left
          </span>
        </div>
        <div className="session-card-tags">
          <span className={`session-price-pill${paid ? " paid" : ""}`}>
            {getSessionPricingLabel(session)}
          </span>
          <span className="session-price-value">{formatSessionPrice(session)}</span>
        </div>
        {summary ? <p>{summary}</p> : null}
        <dl className="session-card-meta">
          <div>
            <dt>Starts</dt>
            <dd>{formatSessionDate(session.session_date)}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{formatSessionLocation(session)}</dd>
          </div>
          <div>
            <dt>Duration</dt>
            <dd>{formatSessionDuration(session.duration_hours)}</dd>
          </div>
          <div>
            <dt>Register by</dt>
            <dd>{formatSessionDeadline(session.registration_deadline)}</dd>
          </div>
          <div>
            <dt>{paid ? "Price" : "Registered"}</dt>
            <dd>{paid ? formatSessionPrice(session) : `${session.going || 0} users`}</dd>
          </div>
        </dl>
      </div>
    </NavLink>
  );
}

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("Loading sessions...");

  useEffect(() => {
    let isActive = true;

    async function loadSessions() {
      setStatus("Loading sessions...");
      try {
        const data = await apiRequest("/v2/sessions", { authRequired: false });
        if (!isActive) {
          return;
        }
        const results = Array.isArray(data?.results) ? data.results : [];
        setSessions(results);
        setStatus(results.length ? "" : "No sessions available right now.");
      } catch (error) {
        if (!isActive) {
          return;
        }
        setSessions([]);
        setStatus("Unable to load sessions right now.");
      }
    }

    loadSessions();
    return () => {
      isActive = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const openCount = sessions.filter((session) => session.registration_open).length;
    const totalSpots = sessions.reduce((sum, session) => {
      const remaining = Number(session.remaining_places);
      return sum + (Number.isFinite(remaining) ? remaining : 0);
    }, 0);
    return {
      total: sessions.length,
      open: openCount,
      spots: totalSpots,
    };
  }, [sessions]);

  return (
    <>
      <section className="sessions-hero">
        <div className="sessions-hero-copy">
          <p className="eyebrow">Boxtobox</p>
          <h1>Sessions</h1>
          <p>
            Explore recurring host-led sports sessions.
          </p>
        </div>
        <div className="sessions-hero-stats">
          <div className="sessions-stat-card">
            <span>Total sessions</span>
            <strong>{metrics.total}</strong>
          </div>
          <div className="sessions-stat-card">
            <span>Open right now</span>
            <strong>{metrics.open}</strong>
          </div>
          <div className="sessions-stat-card">
            <span>Spots remaining</span>
            <strong>{metrics.spots}</strong>
          </div>
        </div>
      </section>

      <section className="sessions-page">
        <div className="search-status">{status}</div>
        <div className="sessions-grid">
          {sessions.map((session) => (
            <SessionCard key={session.id || session.title} session={session} />
          ))}
        </div>
      </section>
    </>
  );
}
