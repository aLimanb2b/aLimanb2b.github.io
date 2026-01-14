const API_BASE = "https://us-central1-boxtobox-fa0e1.cloudfunctions.net/api";
const titleEl = document.getElementById("event-title");
const summaryEl = document.getElementById("event-summary");
const dateEl = document.getElementById("event-date");
const locationEl = document.getElementById("event-location");
const registrationEl = document.getElementById("event-registration");
const spotsEl = document.getElementById("event-spots");
const descriptionEl = document.getElementById("event-description");
const descriptionWrapper = document.getElementById("event-description-wrapper");

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
    month: "long",
    day: "numeric",
  });
}

function formatLocation(event) {
  return event.address_name || event.city || event.region || "TBA";
}

function getSummary(event) {
  return (
    event.summary ||
    event.subtitle ||
    event.short_description ||
    ""
  );
}

function getDescription(event) {
  return (
    event.description ||
    event.details ||
    event.overview ||
    event.notes ||
    ""
  );
}

function renderEvent(event) {
  titleEl.textContent = event.title || "Event";

  const summary = getSummary(event);
  if (summary) {
    summaryEl.textContent = summary;
  } else {
    summaryEl.textContent = "";
  }

  dateEl.textContent = formatDate(event.release_date);
  locationEl.textContent = formatLocation(event);

  if (typeof event.registration_open === "boolean") {
    const deadline = event.deadline ? ` (deadline ${formatDate(event.deadline)})` : "";
    registrationEl.textContent = `${event.registration_open ? "Open" : "Closed"}${deadline}`;
  } else {
    registrationEl.textContent = "TBD";
  }

  const capacity = Number(event.available_places);
  const remaining = Number(event.remaining_places);
  if (Number.isFinite(capacity) && capacity > 0) {
    if (Number.isFinite(remaining)) {
      spotsEl.textContent = `${remaining} of ${capacity} spots left`;
    } else {
      spotsEl.textContent = `${capacity} total spots`;
    }
  } else {
    spotsEl.textContent = "TBD";
  }

  const description = getDescription(event);
  if (description) {
    descriptionEl.textContent = description;
  } else {
    descriptionWrapper.style.display = "none";
  }
}

async function fetchEvent(id) {
  try {
    const response = await fetch(`${API_BASE}/v1/event/${encodeURIComponent(id)}`);
    if (!response.ok) {
      throw new Error("Failed to load event");
    }
    const data = await response.json();
    renderEvent(data || {});
  } catch (error) {
    titleEl.textContent = "Event not found";
    summaryEl.textContent = "We couldn't load this event right now.";
  }
}

const params = new URLSearchParams(window.location.search);
const eventId = params.get("id");
if (!eventId) {
  titleEl.textContent = "Event not found";
  summaryEl.textContent = "Missing event ID.";
} else {
  fetchEvent(eventId);
}
