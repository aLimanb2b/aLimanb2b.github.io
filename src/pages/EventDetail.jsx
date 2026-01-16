import { useEffect, useMemo, useState } from "react";
import { NavLink, useParams, useSearchParams } from "react-router-dom";

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
    month: "long",
    day: "numeric",
  });
}

function formatLocation(event) {
  const address = event.address_name ? String(event.address_name).trim() : "";
  const city = event.city ? String(event.city).trim() : "";
  const region = event.region ? String(event.region).trim() : "";

  if (address && city) {
    return `${address}, ${city}`;
  }
  if (address) {
    return address;
  }
  if (city && region) {
    return `${city}, ${region}`;
  }
  return city || region || "TBA";
}

function getSummary(event) {
  return event.summary || event.subtitle || event.short_description || "";
}

function getDescription(event) {
  return event.description || event.details || event.overview || event.notes || "";
}

function getRules(event) {
  return event.rules || event.rulebook || event.rules_text || "";
}

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

export default function EventDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const eventId = id || searchParams.get("id");
  const [event, setEvent] = useState(null);
  const [status, setStatus] = useState({ title: "Loading...", summary: "" });

  useEffect(() => {
    let isActive = true;

    async function fetchEvent(targetId) {
      if (!targetId) {
        setEvent(null);
        setStatus({ title: "Event not found", summary: "Missing event ID." });
        return;
      }

      setEvent(null);
      setStatus({ title: "Loading...", summary: "" });
      try {
        const response = await fetch(`${API_BASE}/v1/event/${encodeURIComponent(targetId)}`);
        if (!response.ok) {
          throw new Error("Failed to load event");
        }
        const data = await response.json();
        if (!isActive) {
          return;
        }
        setEvent(data || {});
        setStatus({ title: data?.title || "Event", summary: getSummary(data || {}) });
      } catch (error) {
        if (!isActive) {
          return;
        }
        setEvent(null);
        setStatus({ title: "Event not found", summary: "We couldn't load this event right now." });
      }
    }

    fetchEvent(eventId);
    return () => {
      isActive = false;
    };
  }, [eventId]);

  const detailItems = useMemo(() => {
    if (!event) {
      return [
        { label: "Date", value: "TBD" },
        { label: "Location", value: "TBD" },
        { label: "Registration", value: "TBD" },
        { label: "Spots", value: "TBD" },
      ];
    }

    const registration =
      typeof event.registration_open === "boolean"
        ? `${event.registration_open ? "Open" : "Closed"}${
            event.deadline ? ` (deadline ${formatDate(event.deadline)})` : ""
          }`
        : "TBD";

    const capacity = Number(event.available_places);
    const remaining = Number(event.remaining_places);
    let spots = "TBD";
    if (Number.isFinite(capacity) && capacity > 0) {
      if (Number.isFinite(remaining)) {
        spots = `${remaining} of ${capacity} spots left`;
      } else {
        spots = `${capacity} total spots`;
      }
    }

    return [
      { label: "Date", value: formatDate(event.release_date) },
      { label: "Location", value: formatLocation(event) },
      { label: "Registration", value: registration },
      { label: "Spots", value: spots },
    ];
  }, [event]);

  const poster = event ? getEventImage(event) : "";
  const description = event ? getDescription(event) : "";
  const rules = event ? getRules(event).trim() : "";

  return (
    <section className="event-detail">
      <div className="event-detail-card">
        <NavLink className="event-back" to="/events">
          &larr; Back to events
        </NavLink>
        <div className="event-detail-header">
          <h1>{status.title}</h1>
          {status.summary ? <p>{status.summary}</p> : null}
        </div>

        <div className="event-detail-layout">
          <div className="event-detail-poster">
            {poster ? (
              <img className="event-poster-image" src={poster} alt={`${status.title} poster`} />
            ) : (
              <div className="event-poster-placeholder">
                {status.title ? status.title.trim().charAt(0).toUpperCase() : "E"}
              </div>
            )}
          </div>
          <div className="event-detail-info">
            <div className="event-detail-grid">
              {detailItems.map((item) => (
                <div className="event-detail-item" key={item.label}>
                  <p className="label">{item.label}</p>
                  <p>{item.value}</p>
                </div>
              ))}
            </div>
            <p className="event-detail-note">Register on the BoxtoBox app to participate.</p>
          </div>
        </div>

        {description ? (
          <div className="event-detail-body">
            <h2>About</h2>
            <p>{description}</p>
          </div>
        ) : null}
        {rules ? (
          <div className="event-detail-body">
            <h2>Rules</h2>
            <p>{rules}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
