import { useEffect, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { CatalogHeader, ContentListShell, EventRow, compareEventsMostRecentFirst } from "../components/CatalogRows.jsx";

const API_BASE = "https://us-central1-boxtobox-fa0e1.cloudfunctions.net/api";
const PAGE_SIZE = 12;

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
        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load events");
        }
        const data = await response.json();
        if (!isActive) {
          return;
        }
        const results = Array.isArray(data.results) ? [...data.results].sort(compareEventsMostRecentFirst) : [];
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
      <CatalogHeader
        eyebrow="Catalog"
        title="All events"
        action={<NavLink className="btn btn-secondary" to="/events">Search</NavLink>}
      >
        <p>Browse the event catalog and open any listing for registration, payment, and schedule details.</p>
      </CatalogHeader>

      <section className="catalog-page">
        <ContentListShell
          status={status && events.length ? status : ""}
          isEmpty={events.length === 0}
          emptyTitle="No events available"
          emptyMessage={status || "There are no events in the catalog right now."}
          pagination={(
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
          )}
        >
          {events.map((event) => (
            <EventRow event={event} key={event.id || event.title} />
          ))}
        </ContentListShell>
      </section>
    </>
  );
}
