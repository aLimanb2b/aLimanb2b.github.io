import { useEffect, useState } from "react";
import { NavLink, useSearchParams } from "react-router-dom";
import { CatalogHeader, ContentListShell, SessionRow } from "../components/CatalogRows.jsx";
import { apiRequest } from "../lib/api.js";

const PAGE_SIZE = 9;

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
      <CatalogHeader
        eyebrow="Find your next session"
        title="Sessions"
      >
        <p>Explore recurring host-led sports sessions, training blocks, and casual games near you.</p>
      </CatalogHeader>

      <section className="catalog-page">
        <ContentListShell
          status={status && sessions.length ? status : ""}
          isEmpty={sessions.length === 0}
          emptyTitle="No sessions available"
          emptyMessage={status || "There are no sessions available right now."}
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
          {sessions.map((session) => (
            <SessionRow key={session.id || session.title} session={session} />
          ))}
        </ContentListShell>
      </section>
    </>
  );
}
