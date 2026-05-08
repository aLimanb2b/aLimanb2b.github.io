import { NavLink } from "react-router-dom";
import {
  formatSessionDate,
  formatSessionDuration,
  formatSessionLocation,
  getSessionImage,
  getSessionSport,
} from "../lib/sessions.js";

export function formatEventDate(value) {
  if (!value) {
    return "TBD";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatEventLocation(event) {
  return event.address_name || event.city || event.region || event.country || "TBA";
}

export function compareEventsMostRecentFirst(left, right) {
  const leftTime = new Date(left?.release_date || left?.created_at || 0).getTime();
  const rightTime = new Date(right?.release_date || right?.created_at || 0).getTime();
  const normalizedLeft = Number.isNaN(leftTime) ? 0 : leftTime;
  const normalizedRight = Number.isNaN(rightTime) ? 0 : rightTime;
  return normalizedRight - normalizedLeft;
}

export function getEventImage(event) {
  return (
    event.poster_path ||
    event.image_url ||
    event.image ||
    event.banner_url ||
    event.cover_image ||
    event.thumbnail ||
    event.poster_url ||
    ""
  );
}

function getInitial(label, fallback) {
  const normalized = String(label || "").trim();
  return normalized ? normalized[0].toUpperCase() : fallback;
}

function CatalogMedia({ imageUrl, label, fallback }) {
  return (
    <div className="catalog-media">
      {imageUrl ? (
        <img src={imageUrl} alt={label} loading="lazy" />
      ) : (
        <div className="catalog-media-fallback">{getInitial(label, fallback)}</div>
      )}
    </div>
  );
}

export function CatalogHeader({ eyebrow, title, children, action = null }) {
  return (
    <section className="catalog-header">
      <div>
        <p className="site-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        {children}
      </div>
      {action ? <div className="catalog-header-action">{action}</div> : null}
    </section>
  );
}

export function ContentListShell({ status, isEmpty, emptyTitle, emptyMessage, children, pagination = null }) {
  return (
    <div className="catalog-list-shell">
      {status ? <div className="catalog-status">{status}</div> : null}
      {isEmpty ? (
        <div className="catalog-empty">
          <h2>{emptyTitle}</h2>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="catalog-list">{children}</div>
      )}
      {pagination}
    </div>
  );
}

export function EventRow({ event }) {
  const title = event.title || "Untitled event";
  const imageUrl = getEventImage(event);
  const fee = Number(event.entry_fee || 0);

  return (
    <NavLink
      className="catalog-row"
      to={`/event/${encodeURIComponent(event.id)}`}
      aria-label={`View ${title} details`}
    >
      <CatalogMedia imageUrl={imageUrl} label={`${title} image`} fallback="E" />
      <div className="catalog-main">
        <h3>{title}</h3>
        <p>{formatEventLocation(event)}</p>
      </div>
      <dl className="catalog-meta">
        <div>
          <dt>Date</dt>
          <dd>{formatEventDate(event.release_date)}</dd>
        </div>
        <div>
          <dt>Entry</dt>
          <dd>{fee > 0 ? `NGN ${fee.toLocaleString()}` : "Free"}</dd>
        </div>
      </dl>
      <span className="catalog-action">View</span>
    </NavLink>
  );
}

export function SessionRow({ session }) {
  const title = session.title || "Untitled session";
  const imageUrl = getSessionImage(session);
  const remaining = Number(session.remaining_places ?? session.available_places);
  const remainingLabel = Number.isFinite(remaining) ? `${remaining} spots` : "TBD";

  return (
    <NavLink
      className="catalog-row"
      to={`/session/${encodeURIComponent(session.id)}`}
      aria-label={`View ${title} details`}
    >
      <CatalogMedia imageUrl={imageUrl} label={`${title} image`} fallback="S" />
      <div className="catalog-main">
        <span className="catalog-pill">{getSessionSport(session)}</span>
        <h3>{title}</h3>
        <p>{formatSessionLocation(session)}</p>
      </div>
      <dl className="catalog-meta">
        <div>
          <dt>Starts</dt>
          <dd>{formatSessionDate(session.session_date)}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{formatSessionDuration(session.duration_hours)}</dd>
        </div>
        <div>
          <dt>Open</dt>
          <dd>{remainingLabel}</dd>
        </div>
      </dl>
      <span className="catalog-action">View</span>
    </NavLink>
  );
}
