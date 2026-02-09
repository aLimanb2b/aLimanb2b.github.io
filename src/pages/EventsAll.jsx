import { useEffect, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";

const API_BASE = "https://us-central1-boxtobox-fa0e1.cloudfunctions.net/api";
const PAGE_SIZE = 12;

function getEventImage(event) {
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

export default function EventsAll() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("Loading events...");
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

    async function fetchPage(page) {
      setStatus("Loading events...");
      try {
        const url = new URL(`${API_BASE}/v1.5/events/search`);
        url.searchParams.set("page", String(page));
        url.searchParams.set("page_size", String(PAGE_SIZE));
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error("Failed to load events");
        }
        const data = await response.json();
        if (!isActive) {
          return;
        }
        const results = Array.isArray(data.results) ? data.results : [];
        setEvents(results);
        setStatus(results.length ? "" : "No events found.");
        setCurrentPage(Number(data.page) || page);
        setTotalPages(Number(data.total_pages) || 1);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setEvents([]);
        setStatus("Unable to load events right now.");
        setTotalPages(1);
      }
    }

    fetchPage(currentPage);
    return () => {
      isActive = false;
    };
  }, [currentPage]);

  return (
    <>
      <section className="events-hero">
        <div>
          <p className="eyebrow">All fixtures</p>
          <h1>All Events</h1>
          <p>Browse the full events catalog. Tap any event to see details.</p>
        </div>
      </section>

      <section className="events-gallery">
        <div className="search-status">{status}</div>
        <div className="events-gallery-grid">
          {events.map((event) => {
            const imageUrl = getEventImage(event);
            const label = (event.title || "Event").trim();
            return (
              <NavLink
                className="event-tile"
                to={`/event/${encodeURIComponent(event.id)}`}
                aria-label={`View ${event.title || "event"} details`}
                key={event.id || event.title}
              >
                <div className="event-tile-image">
                  {imageUrl ? (
                    <img src={imageUrl} alt={event.title || "Event image"} loading="lazy" />
                  ) : (
                    <div className="event-tile-placeholder">{label ? label[0].toUpperCase() : "E"}</div>
                  )}
                </div>
                <div className="event-tile-body">
                  <h3>{event.title || "Untitled event"}</h3>
                </div>
              </NavLink>
            );
          })}
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
