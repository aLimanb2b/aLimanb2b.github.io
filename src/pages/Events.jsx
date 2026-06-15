import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { CatalogHeader, ContentListShell, EventRow, compareEventsMostRecentFirst } from "../components/CatalogRows.jsx";

const API_BASE = "https://us-central1-boxtobox-fa0e1.cloudfunctions.net/api";

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
        const url = new URL(`${API_BASE}/v1.5/events/search`);
        url.searchParams.set("page_size", "10");
        url.searchParams.set("q", trimmed);
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load events");
        }
        const data = await response.json();
        if (requestId !== activeRequest.current) {
          return;
        }
        const results = Array.isArray(data.results) ? [...data.results].sort(compareEventsMostRecentFirst) : [];
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

  const trimmedQuery = query.trim();
  const isEmpty = events.length === 0;
  const emptyTitle = trimmedQuery ? "No events found" : "Search events";
  const emptyMessage = trimmedQuery
    ? "Try a different event title or browse the full catalog."
    : "Enter an event name to find tournaments, fixtures, and community games.";

  return (
    <>
      <CatalogHeader
        eyebrow="Find your next match"
        title="Events"
        action={<NavLink className="btn btn-secondary" to="/events-all">View all</NavLink>}
      >
        <p>Search tournaments, pickup games, and community fixtures hosted on BoxtoBox.</p>
      </CatalogHeader>

      <section className="catalog-page">
        <div className="catalog-toolbar">
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

        <ContentListShell
          status={status && !isEmpty ? status : ""}
          isEmpty={isEmpty}
          emptyTitle={emptyTitle}
          emptyMessage={emptyMessage}
        >
          {events.map((event) => (
            <EventRow event={event} key={event.id || event.title} />
          ))}
        </ContentListShell>
      </section>
    </>
  );
}
