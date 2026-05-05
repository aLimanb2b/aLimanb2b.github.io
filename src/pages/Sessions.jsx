import { useEffect, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";
import {
  formatSessionDate,
  formatSessionDuration,
  formatSessionLocation,
  getSessionImage,
  getSessionSport,
} from "../lib/sessions.js";

const PAGE_SIZE = 9;

function SessionCard({ session }) {
  const imageUrl = getSessionImage(session);
  const label = (session.title || "Session").trim();

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
        </div>
        <div className="session-card-tags">
          <span className="session-sport-pill">{getSessionSport(session)}</span>
        </div>
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
        </dl>
      </div>
    </NavLink>
  );
}

export default function Sessions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessions, setSessions] = useState([]);
  const [status, setStatus] = useState("Loading sessions...");
  const [currentPage, setCurrentPage] = useState(() => {
    const page = Number(searchParams.get("page") || 1);
    return Number.isFinite(page) ? Math.max(1, page) : 1;
  });
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setSearchParams({ page: String(currentPage) }, { replace: true });
  }, [currentPage, setSearchParams]);

  useEffect(() => {
    let isActive = true;

    async function loadSessions() {
      setStatus("Loading sessions...");
      try {
        const data = await apiRequest("/v2/sessions", {
          authRequired: false,
          query: {
            page: currentPage,
            page_size: PAGE_SIZE,
          },
        });
        if (!isActive) {
          return;
        }
        const results = Array.isArray(data?.results) ? data.results : [];
        const serverTotalPages = Number(data?.total_pages);
        const hasServerPagination = Number.isFinite(serverTotalPages) && serverTotalPages > 0;
        const nextPage = Number(data?.page) || currentPage;
        const nextTotalPages = hasServerPagination
          ? Math.max(1, serverTotalPages)
          : Math.max(1, Math.ceil(results.length / PAGE_SIZE));
        const visibleResults = hasServerPagination
          ? results
          : results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

        setSessions(visibleResults);
        setStatus(visibleResults.length ? "" : "No sessions available right now.");
        setCurrentPage(nextPage);
        setTotalPages(nextTotalPages);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setSessions([]);
        setStatus("Unable to load sessions right now.");
        setTotalPages(1);
      }
    }

    loadSessions();
    return () => {
      isActive = false;
    };
  }, [currentPage]);

  return (
    <>
      <section className="sessions-hero">
        <div className="sessions-hero-copy">
          <p className="eyebrow">Find your next session</p>
          <h1>Sessions</h1>
          <p>Explore recurring host-led sports sessions near you.</p>
        </div>
      </section>

      <section className="sessions-page">
        <div className="search-status">{status}</div>
        <div className="sessions-grid">
          {sessions.map((session) => (
            <SessionCard key={session.id || session.title} session={session} />
          ))}
        </div>
        <div className="events-pagination">
          <button
            className="pagination-btn"
            type="button"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </button>
          <span className="pagination-info">Page {currentPage} of {totalPages}</span>
          <button
            className="pagination-btn"
            type="button"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </button>
        </div>
      </section>
    </>
  );
}
