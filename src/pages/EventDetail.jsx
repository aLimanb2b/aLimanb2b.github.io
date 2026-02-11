import { useEffect, useMemo, useState } from "react";
import { NavLink, useParams, useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";
import { getAuthUser, observeAuthState } from "../lib/auth.js";

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
  const [accountState, setAccountState] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });
  const safeGetAuthUser = () => {
    try {
      return getAuthUser();
    } catch (error) {
      return null;
    }
  };

  useEffect(() => {
    let unsubscribe = null;
    try {
      unsubscribe = observeAuthState(() => {
        if (eventId) {
          fetchAccountState(eventId);
        }
      });
    } catch (error) {
      // noop
    }
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [eventId]);

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
        const response = await fetch(`${API_BASE}/v1.5/event/${encodeURIComponent(targetId)}`);
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

  useEffect(() => {
    if (!eventId) {
      return;
    }
    if (!safeGetAuthUser()) {
      setAccountState(null);
      return;
    }
    fetchAccountState(eventId);
  }, [eventId]);

  useEffect(() => {
    if (!paymentOpen) {
      return;
    }
    const user = safeGetAuthUser();
    if (!user) {
      return;
    }
    const displayName = user.displayName || "";
    const parts = displayName.trim().split(" ").filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ");
    setPaymentForm((prev) => ({
      ...prev,
      firstName: prev.firstName || firstName,
      lastName: prev.lastName || lastName,
      email: prev.email || user.email || "",
      phoneNumber: prev.phoneNumber || user.phoneNumber || "",
    }));
  }, [paymentOpen]);

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
      // { label: "Spots", value: spots },
    ];
  }, [event]);

  const poster = event ? getEventImage(event) : "";
  const description = event ? getDescription(event) : "";
  const rules = event ? getRules(event).trim() : "";
  const entryFee = Number(event?.entry_fee ?? 0);
  const paymentRequired =
    typeof event?.payment_required === "boolean" ? event.payment_required : entryFee > 0;
  const paymentStatus = String(accountState?.payment_status || "").toLowerCase();
  const isPaid =
    Boolean(accountState?.paid) ||
    ["paid", "success", "successful", "completed", "complete", "approved", "succeeded"].includes(paymentStatus);
  const isRegistered = Boolean(accountState?.register) || isPaid;
  const registrationOpen = event?.registration_open !== false;
  const remaining = Number(event?.remaining_places ?? event?.available_places ?? 0);
  const hasSpots = !Number.isFinite(remaining) || remaining > 0;

  async function fetchAccountState(targetId) {
    const accountId = safeGetAuthUser()?.uid || "";
    if (!accountId) {
      return;
    }
    setAccountLoading(true);
    setActionError("");
    try {
      const data = await apiRequest(`/v1.5/event/${encodeURIComponent(targetId)}/account_states`, {
        query: { session_id: accountId },
      });
      setAccountState(data || null);
    } catch (error) {
      setAccountState(null);
    } finally {
      setAccountLoading(false);
    }
  }

  const openAuthModal = (mode = "signin") => {
    window.dispatchEvent(new CustomEvent("auth:open", { detail: { mode } }));
  };

  const handleRegisterClick = async () => {
    setActionError("");
    setActionMessage("");
    if (!eventId || !event) {
      return;
    }
    const accountId = safeGetAuthUser()?.uid || "";
    if (!accountId) {
      openAuthModal("signin");
      return;
    }
    if ((!registrationOpen || !hasSpots) && !isRegistered) {
      return;
    }
    if (paymentRequired && entryFee > 0) {
      setPaymentError("");
      setPaymentDetails(null);
      setPaymentStep(1);
      setPaymentOpen(true);
      return;
    }
    try {
      await apiRequest(`/v1.5/event/${encodeURIComponent(eventId)}/register`, {
        method: "POST",
        body: {
          account_id: accountId,
          register: true,
        },
      });
      await fetchAccountState(eventId);
      setActionMessage("You are registered for this event.");
    } catch (error) {
      setActionError(error?.message || "Unable to register right now.");
    }
  };

  const handlePaymentFieldChange = (event) => {
    const { name, value } = event.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitBankTransfer = async (event) => {
    event.preventDefault();
    setPaymentError("");
    setPaymentLoading(true);
    try {
      const accountId = safeGetAuthUser()?.uid || "";
      if (!accountId) {
        setPaymentError("Sign in to continue.");
        return;
      }
      if (!registrationOpen && !isRegistered) {
        setPaymentError("Registration is closed.");
        return;
      }
      if (!hasSpots && !isRegistered) {
        setPaymentError("This event is sold out.");
        return;
      }
      if (!isRegistered) {
        await apiRequest(`/v1.5/event/${encodeURIComponent(eventId)}/register`, {
          method: "POST",
          body: {
            account_id: accountId,
            register: true,
          },
        });
        await fetchAccountState(eventId);
      }
      const payload = await apiRequest(
        `/v1.5/event/${encodeURIComponent(eventId)}/payment/bank-transfer/virtual-account`,
        {
          method: "POST",
          body: {
            account_id: accountId,
            first_name: paymentForm.firstName.trim(),
            last_name: paymentForm.lastName.trim(),
            email: paymentForm.email.trim(),
            phone_number: paymentForm.phoneNumber.trim(),
          },
        }
      );
      setPaymentDetails(payload);
      setPaymentStep(2);
    } catch (error) {
      setPaymentError(error?.message || "Unable to create virtual account.");
    } finally {
      setPaymentLoading(false);
    }
  };

  const refreshBankTransfer = async () => {
    if (!paymentDetails?.transaction_id) {
      return;
    }
    const accountId = safeGetAuthUser()?.uid || "";
    if (!accountId) {
      setPaymentError("Sign in to check payment status.");
      return;
    }
    setPaymentError("");
    setPaymentLoading(true);
    try {
      const payload = await apiRequest(
        `/v1.5/event/${encodeURIComponent(eventId)}/payment/bank-transfer/transaction/${encodeURIComponent(
          paymentDetails.transaction_id
        )}`,
        {
          query: { account_id: accountId },
        }
      );
      setPaymentDetails(payload);
      if (String(payload.payment_status || "").toLowerCase() === "paid") {
        await apiRequest(`/v1.5/event/${encodeURIComponent(eventId)}/register`, {
          method: "POST",
          body: {
            account_id: accountId,
            register: true,
          },
        });
        await fetchAccountState(eventId);
        setPaymentOpen(false);
        setActionMessage("Payment confirmed. You are registered.");
      }
    } catch (error) {
      setPaymentError(error?.message || "Unable to refresh payment status.");
    } finally {
      setPaymentLoading(false);
    }
  };

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
            <div className="event-detail-actions">
              <div className="event-action-row">
                <div>
                  <p className="event-action-title">Register</p>
                  <p className="event-action-subtitle">
                    {paymentRequired && entryFee > 0
                      ? `Entry fee: ${event?.currency || "NGN"} ${entryFee}`
                      : "Free event"}
                  </p>
                </div>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={
                    accountLoading ||
                    (paymentRequired && entryFee > 0
                      ? isPaid || (!registrationOpen && !isRegistered) || (!hasSpots && !isRegistered)
                      : isRegistered || !registrationOpen || !hasSpots)
                  }
                  onClick={handleRegisterClick}
                >
                  {isPaid
                    ? "Registered"
                    : accountLoading
                    ? "Checking..."
                    : !registrationOpen
                    ? "Registration closed"
                    : !hasSpots
                    ? "Sold out"
                    : paymentRequired && entryFee > 0
                    ? isRegistered
                      ? "Continue Payment"
                      : "Register & Pay"
                    : "Register Free"}
                </button>
              </div>
              {actionError ? <p className="event-action-error">{actionError}</p> : null}
              {actionMessage ? <p className="event-action-success">{actionMessage}</p> : null}
              {!safeGetAuthUser() ? (
                <p className="event-action-note">Sign in to register for this event.</p>
              ) : null}
            </div>
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

      {paymentOpen && (
        <div
          className="payment-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Bank transfer"
          onClick={(event) => {
            if (event.target.classList.contains("payment-overlay")) {
              setPaymentOpen(false);
            }
          }}
        >
          <div className="payment-card">
            <div className="payment-header">
              <div>
                <p className="payment-eyebrow">Bank Transfer</p>
                <h2>{paymentStep === 1 ? "Confirm your details" : "Virtual account details"}</h2>
              </div>
              <button
                className="payment-close"
                type="button"
                aria-label="Close"
                onClick={() => setPaymentOpen(false)}
              >
                x
              </button>
            </div>

            <div className="payment-steps">
              <span className={`payment-step${paymentStep === 1 ? " active" : ""}`}>1</span>
              <span className={`payment-step${paymentStep === 2 ? " active" : ""}`}>2</span>
            </div>

            {paymentError ? <div className="payment-error">{paymentError}</div> : null}

            {paymentStep === 1 && (
              <form className="payment-form" onSubmit={submitBankTransfer}>
                <label className="payment-field">
                  First name
                  <input
                    name="firstName"
                    type="text"
                    value={paymentForm.firstName}
                    onChange={handlePaymentFieldChange}
                    required
                  />
                </label>
                <label className="payment-field">
                  Last name
                  <input
                    name="lastName"
                    type="text"
                    value={paymentForm.lastName}
                    onChange={handlePaymentFieldChange}
                    required
                  />
                </label>
                <label className="payment-field">
                  Email
                  <input
                    name="email"
                    type="email"
                    value={paymentForm.email}
                    onChange={handlePaymentFieldChange}
                    required
                  />
                </label>
                <label className="payment-field">
                  Phone number
                  <input
                    name="phoneNumber"
                    type="tel"
                    value={paymentForm.phoneNumber}
                    onChange={handlePaymentFieldChange}
                    required
                  />
                </label>
                <button className="payment-submit" type="submit" disabled={paymentLoading}>
                  {paymentLoading ? "Creating..." : "Continue"}
                </button>
              </form>
            )}

            {paymentStep === 2 && (
              <div className="payment-details">
                <div className="payment-detail-grid">
                  <div>
                    <p className="label">Account number</p>
                    <p>{paymentDetails?.virtual_account_number || "—"}</p>
                  </div>
                  <div>
                    <p className="label">Bank name</p>
                    <p>WEMA Bank / ALATPay</p>
                  </div>
                  <div>
                    <p className="label">Amount</p>
                    <p>
                      {paymentDetails?.currency || event?.currency || "NGN"}{" "}
                      {paymentDetails?.amount ?? entryFee}
                    </p>
                  </div>
                  <div>
                    <p className="label">Status</p>
                    <p>{paymentDetails?.payment_status || "pending"}</p>
                  </div>
                </div>
                {paymentDetails?.message ? (
                  <p className="payment-note">{paymentDetails.message}</p>
                ) : null}
                <button
                  className="payment-submit"
                  type="button"
                  onClick={refreshBankTransfer}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? "Checking..." : "Check payment status"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
