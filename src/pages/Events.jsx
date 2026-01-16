import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

const API_BASE = "https://us-central1-boxtobox-fa0e1.cloudfunctions.net/api";

function formatDate(value) {
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

function formatLocation(event) {
  return event.address_name || event.city || event.region || "TBA";
}

export default function Events() {
  const [query, setQuery] = useState("");
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("Type to search or view all events.");
  const activeRequest = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setEvents([]);
      setStatus("Type to search or view all events.");
      return undefined;
    }

    const requestId = ++activeRequest.current;
    setStatus("Loading events...");
    const timeout = window.setTimeout(async () => {
      try {
        const url = new URL(`${API_BASE}/v1/events/search`);
        url.searchParams.set("page_size", "10");
        url.searchParams.set("q", trimmed);
        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error("Failed to load events");
        }
        const data = await response.json();
        if (requestId !== activeRequest.current) {
          return;
        }
        const results = Array.isArray(data.results) ? data.results : [];
        setEvents(results);
        setStatus(results.length ? "" : "No events found.");
      } catch (error) {
        if (requestId !== activeRequest.current) {
          return;
        }
        setEvents([]);
        setStatus("Unable to load events right now.");
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query]);

  return (
    <>
      <section className="events-hero">
        <div>
          <p className="eyebrow">Find your next match</p>
          <h1>Events</h1>
          <p>Search upcoming tournaments, pickup games, and community fixtures.</p>
        </div>
      </section>

      <section className="events-search">
        <div className="search-bar">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events by title"
            aria-label="Search events by title"
          />
          <NavLink className="btn btn-primary" to="/events-all">
            View all events
          </NavLink>
        </div>
        <div className="search-status">{status}</div>
        <ul className="event-search-list">
          {events.map((event) => (
            <li className="event-search-item" key={event.id || event.title}>
              <NavLink
                to={`/event/${encodeURIComponent(event.id)}`}
                aria-label={`View ${event.title || "event"} details`}
              >
                <div className="event-search-content">
                  <h3>{event.title || "Untitled event"}</h3>
                  <div className="event-search-meta">
                    <span>{formatDate(event.release_date)}</span>
                    <span>{formatLocation(event)}</span>
                  </div>
                </div>
                <span className="event-search-chevron">&gt;</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
