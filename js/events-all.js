const API_BASE = "https://us-central1-boxtobox-fa0e1.cloudfunctions.net/api";
const gridEl = document.getElementById("events-all-grid");
const statusEl = document.getElementById("events-all-status");
const prevBtn = document.getElementById("events-page-prev");
const nextBtn = document.getElementById("events-page-next");
const pageInfo = document.getElementById("events-page-info");

const PAGE_SIZE = 12;
let currentPage = 1;
let totalPages = 1;

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

function renderEvents(events) {
  gridEl.innerHTML = "";
  if (!events.length) {
    statusEl.textContent = "No events found.";
    return;
  }
  statusEl.textContent = "";
  const fragment = document.createDocumentFragment();
  events.forEach((event) => {
    const tile = document.createElement("a");
    tile.className = "event-tile";
    tile.href = `event-detail.html?id=${encodeURIComponent(event.id)}`;
    tile.setAttribute("aria-label", `View ${event.title || "event"} details`);

    const imageWrap = document.createElement("div");
    imageWrap.className = "event-tile-image";

    const imageUrl = getEventImage(event);
    if (imageUrl) {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = event.title || "Event image";
      img.loading = "lazy";
      imageWrap.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "event-tile-placeholder";
      const label = (event.title || "Event").trim();
      placeholder.textContent = label ? label[0].toUpperCase() : "E";
      imageWrap.appendChild(placeholder);
    }

    const body = document.createElement("div");
    body.className = "event-tile-body";

    const title = document.createElement("h3");
    title.textContent = event.title || "Untitled event";

    body.append(title);
    tile.append(imageWrap, body);
    fragment.appendChild(tile);
  });
  gridEl.appendChild(fragment);
}

function updatePagination() {
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= totalPages;
}

async function fetchPage(page) {
  statusEl.textContent = "Loading events...";
  gridEl.innerHTML = "";
  const url = new URL(`${API_BASE}/v1/events/search`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(PAGE_SIZE));
  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error("Failed to load events");
    }
    const data = await response.json();
    currentPage = Number(data.page) || page;
    totalPages = Number(data.total_pages) || 1;
    renderEvents(Array.isArray(data.results) ? data.results : []);
    updatePagination();
    const params = new URLSearchParams(window.location.search);
    params.set("page", String(currentPage));
    window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  } catch (error) {
    statusEl.textContent = "Unable to load events right now.";
    updatePagination();
  }
}

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    fetchPage(currentPage - 1);
  }
});

nextBtn.addEventListener("click", () => {
  if (currentPage < totalPages) {
    fetchPage(currentPage + 1);
  }
});

const params = new URLSearchParams(window.location.search);
const initialPage = Math.max(1, Number(params.get("page") || 1));
fetchPage(initialPage);
