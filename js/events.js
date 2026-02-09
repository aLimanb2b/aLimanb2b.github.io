const API_BASE = "https://us-central1-boxtobox-fa0e1.cloudfunctions.net/api";
const searchInput = document.getElementById("event-search-input");
const resultsEl = document.getElementById("event-results");
const statusEl = document.getElementById("event-search-status");

let activeRequest = 0;

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

function renderResults(events) {
  resultsEl.innerHTML = "";
  if (!events.length) {
    statusEl.textContent = "No events found.";
    return;
  }
  statusEl.textContent = "";
  const fragment = document.createDocumentFragment();
  events.forEach((event) => {
    const item = document.createElement("li");
    item.className = "event-search-item";

    const link = document.createElement("a");
    link.href = `event-detail.html?id=${encodeURIComponent(event.id)}`;
    link.setAttribute("aria-label", `View ${event.title || "event"} details`);

    const content = document.createElement("div");
    content.className = "event-search-content";
    const title = document.createElement("h3");
    title.textContent = event.title || "Untitled event";

    const meta = document.createElement("div");
    meta.className = "event-search-meta";

    const date = document.createElement("span");
    date.textContent = formatDate(event.release_date);

    const location = document.createElement("span");
    location.textContent = formatLocation(event);

    meta.append(date, location);
    content.append(title, meta);

    const chevron = document.createElement("span");
    chevron.className = "event-search-chevron";
    chevron.textContent = ">";

    link.append(content, chevron);
    item.appendChild(link);
    fragment.appendChild(item);
  });
  resultsEl.appendChild(fragment);
}

async function fetchEvents(query) {
  const requestId = ++activeRequest;
  statusEl.textContent = "Loading events...";
  resultsEl.innerHTML = "";
  try {
    const url = new URL(`${API_BASE}/v2/events/search`);
    url.searchParams.set("page_size", "10");
    if (query) {
      url.searchParams.set("q", query);
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error("Failed to load events");
    }
    const data = await response.json();
    if (requestId !== activeRequest) {
      return;
    }
    renderResults(Array.isArray(data.results) ? data.results : []);
  } catch (error) {
    if (requestId !== activeRequest) {
      return;
    }
    statusEl.textContent = "Unable to load events right now.";
  }
}

function debounce(callback, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}

const debouncedSearch = debounce((value) => {
  const trimmed = value.trim();
  if (!trimmed) {
    statusEl.textContent = "Type to search or view all events.";
    resultsEl.innerHTML = "";
    return;
  }
  fetchEvents(trimmed);
}, 250);

searchInput.addEventListener("input", (event) => {
  debouncedSearch(event.target.value);
});
