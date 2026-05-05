export function formatSessionDate(value) {
  if (!value) {
    return "Schedule to be announced";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Schedule to be announced";
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSessionEndAt(value) {
  if (!value) {
    return "TBD";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "TBD";
  }
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatSessionDeadline(value) {
  if (!value) {
    return "No registration deadline";
  }
  return formatSessionDate(value);
}

export function formatSessionDuration(value) {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) {
    return "Duration TBD";
  }
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function formatSessionLocation(session) {
  const address = session.address_name ? String(session.address_name).trim() : "";
  const city = session.city ? String(session.city).trim() : "";
  const region = session.region ? String(session.region).trim() : "";

  if (address && city) {
    return `${address}, ${city}`;
  }
  if (address) {
    return address;
  }
  if (city && region) {
    return `${city}, ${region}`;
  }
  return city || region || "Location to be announced";
}

export function getSessionImage(session) {
  return (
    session.poster_path ||
    session.image_url ||
    session.image ||
    session.banner_url ||
    session.cover_image ||
    session.thumbnail ||
    session.poster_url ||
    ""
  );
}

export function getSessionSummary(session) {
  return (
    session.subtitle ||
    session.summary ||
    session.short_description ||
    session.overview ||
    ""
  );
}

export function getSessionSport(session) {
  const sport =
    session?.sport_name ||
    session?.sport_type ||
    session?.sport?.name ||
    session?.sport ||
    session?.activity_name ||
    session?.activity?.name ||
    session?.activity ||
    session?.category_name ||
    session?.category?.name ||
    session?.category ||
    "";

  if (typeof sport !== "string") {
    return "Sport TBD";
  }

  const label = sport.trim();
  return label || "Sport TBD";
}

export function getRegisteredUsers(session) {
  if (!Array.isArray(session?.registered_users)) {
    return [];
  }
  return session.registered_users.filter((user) => user && user.id);
}

export function getSessionStatusLabel(session) {
  if (session?.session_status === "live") {
    return "Live Now";
  }
  if (session?.session_status === "completed") {
    return "Completed";
  }
  return session?.registration_open ? "Registration Open" : "Registration Closed";
}

export function isPaidSession(session) {
  return Number(session?.entry_fee || 0) > 0 || Boolean(session?.payment_required);
}

export function formatSessionPrice(session) {
  const amount = Number(session?.entry_fee || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Free";
  }

  const currency = typeof session?.currency === "string" && session.currency.trim()
    ? session.currency.trim().toUpperCase()
    : "NGN";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch (error) {
    return `${currency} ${amount}`;
  }
}

export function getSessionPricingLabel(session) {
  return isPaidSession(session) ? "Paid Session" : "Free Session";
}
