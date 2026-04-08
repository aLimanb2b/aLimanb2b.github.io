import { useEffect, useMemo, useState } from "react";
import { NavLink, useParams, useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";
import { getAuthUser, observeAuthState } from "../lib/auth.js";
import {
  formatSessionDate,
  formatSessionDuration,
  formatSessionLocation,
  formatSessionPrice,
  getRegisteredUsers,
  getSessionImage,
  getSessionPricingLabel,
  getSessionStatusLabel,
  getSessionSummary,
  isPaidSession,
} from "../lib/sessions.js";

function RegisteredUserCard({ user }) {
  const name = user.name || "Registered user";
  const initial = name.trim() ? name.trim()[0].toUpperCase() : "U";

  return (
    <li className="session-user-card">
      {user.avatar ? (
        <img className="session-user-avatar" src={user.avatar} alt={name} loading="lazy" />
      ) : (
        <div className="session-user-avatar session-user-avatar-fallback">{initial}</div>
      )}
      <div>
        <h3>{name}</h3>
        <p>{user.id}</p>
      </div>
    </li>
  );
}

export default function SessionDetail() {
  function safeGetAuthUser() {
    try {
      return getAuthUser();
    } catch (error) {
      return null;
    }
  }

  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("Loading session...");
  const [authUser, setAuthUser] = useState(() => safeGetAuthUser());
  const [accountState, setAccountState] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let unsubscribe = null;
    try {
      unsubscribe = observeAuthState((user) => {
        setAuthUser(user || null);
        if (id && user?.uid) {
          fetchAccountState(id, user.uid);
          return;
        }
        setAccountState(null);
      });
    } catch (error) {
      // noop
    }
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [id]);

  useEffect(() => {
    if (!id) {
      setSession(null);
      setStatus("Session not found.");
      return;
    }

    let isActive = true;

    async function loadSession(targetId) {
      setStatus("Loading session...");
      try {
        const data = await apiRequest(`/v2/session/${encodeURIComponent(targetId)}`, { authRequired: false });
        if (!isActive) {
          return null;
        }
        setSession(data);
        setStatus("");
        return data;
      } catch (error) {
        if (!isActive) {
          return null;
        }
        setSession(null);
        setStatus(error?.message || "Unable to load session right now.");
        return null;
      }
    }

    loadSession(id);
    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!id) {
      return;
    }
    if (!authUser?.uid) {
      setAccountState(null);
      return;
    }
    fetchAccountState(id, authUser.uid);
  }, [authUser?.uid, id]);

  useEffect(() => {
    const paystackReturn = searchParams.get("paystack");
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    if (paystackReturn !== "return" || !reference || !id) {
      return;
    }

    const accountId = authUser?.uid || "";
    if (!accountId) {
      setActionError("Sign in to verify your session payment.");
      return;
    }

    let isActive = true;

    async function verifyReturnedPayment() {
      setPaymentLoading(true);
      setActionError("");
      setActionMessage("Verifying payment...");
      try {
        const result = await apiRequest(`/v2/session/${encodeURIComponent(id)}/payment/paystack/verify`, {
          method: "POST",
          body: { reference },
        });
        if (!isActive) {
          return;
        }
        await Promise.all([loadSession(id), fetchAccountState(id, accountId)]);
        setActionMessage(
          result?.registered
            ? "Payment confirmed and your session spot is secured."
            : result?.message || "Payment confirmed, but registration could not be completed.",
        );
        setSearchParams({}, { replace: true });
      } catch (error) {
        if (!isActive) {
          return;
        }
        setActionError(error?.message || "Unable to verify your payment right now.");
      } finally {
        if (isActive) {
          setPaymentLoading(false);
        }
      }
    }

    verifyReturnedPayment();
    return () => {
      isActive = false;
    };
  }, [authUser?.uid, id, searchParams, setSearchParams]);

  const registeredUsers = useMemo(() => getRegisteredUsers(session), [session]);
  const rules = useMemo(
    () => (Array.isArray(session?.rules) ? session.rules.filter((rule) => String(rule || "").trim()) : []),
    [session],
  );
  const imageUrl = getSessionImage(session || {});
  const summary = getSessionSummary(session || {});
  const paid = isPaidSession(session || {});
  const paymentStatus = String(accountState?.payment_status || "").toLowerCase();
  const isPaid = Boolean(accountState?.paid) || ["paid", "success", "successful", "completed", "complete"].includes(paymentStatus);
  const isRegistered = Boolean(accountState?.register) || isPaid;
  const registrationOpen = session?.registration_open !== false;
  const remaining = Number(session?.remaining_places ?? session?.available_places ?? 0);
  const hasSpots = !Number.isFinite(remaining) || remaining > 0;

  if (!session) {
    return (
      <section className="session-detail">
        <div className="event-detail-card">
          <NavLink className="event-back" to="/sessions">
            &larr; Back to Sessions
          </NavLink>
          <p className="search-status">{status}</p>
        </div>
      </section>
    );
  }

  async function loadSession(targetId) {
    if (!targetId) {
      return null;
    }
    setStatus("Loading session...");
    try {
      const data = await apiRequest(`/v2/session/${encodeURIComponent(targetId)}`, { authRequired: false });
      setSession(data);
      setStatus("");
      return data;
    } catch (error) {
      setSession(null);
      setStatus(error?.message || "Unable to load session right now.");
      return null;
    }
  }

  async function fetchAccountState(targetId, explicitAccountId) {
    const accountId = explicitAccountId || authUser?.uid || "";
    if (!accountId) {
      setAccountState(null);
      return;
    }
    setAccountLoading(true);
    setActionError("");
    try {
      const data = await apiRequest(`/v2/session/${encodeURIComponent(targetId)}/account_states`, {
        query: { account_id: accountId },
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

  const buildPaystackCallbackUrl = () => {
    const hashPath = (window.location.hash || `#/session/${encodeURIComponent(id)}`).split("?")[0];
    return `${window.location.origin}${window.location.pathname}${hashPath}?paystack=return`;
  };

  const handleRegisterClick = async () => {
    setActionError("");
    setActionMessage("");
    if (!id || !session) {
      return;
    }
    const accountId = authUser?.uid || "";
    if (!accountId) {
      openAuthModal("signin");
      return;
    }
    if ((!registrationOpen || !hasSpots) && !isRegistered) {
      return;
    }

    try {
      await apiRequest(`/v2/session/${encodeURIComponent(id)}/register`, {
        method: "POST",
        body: { account_id: accountId },
      });
      await Promise.all([loadSession(id), fetchAccountState(id, accountId)]);
      setActionMessage("You are registered for this session.");
    } catch (error) {
      setActionError(error?.message || "Unable to register right now.");
    }
  };

  const handlePayClick = async () => {
    setActionError("");
    setActionMessage("");
    if (!id || !session) {
      return;
    }

    const user = authUser;
    const accountId = user?.uid || "";
    if (!accountId) {
      openAuthModal("signin");
      return;
    }
    if (!user?.email) {
      setActionError("A verified email is required before starting payment.");
      return;
    }

    try {
      setPaymentLoading(true);
      const result = await apiRequest(`/v2/session/${encodeURIComponent(id)}/payment/paystack/initialize`, {
        method: "POST",
        body: {
          account_id: accountId,
          email: user.email,
          callback_url: buildPaystackCallbackUrl(),
        },
      });

      if (!result?.authorization_url) {
        throw new Error("Unable to start Paystack checkout right now.");
      }

      window.location.assign(result.authorization_url);
    } catch (error) {
      setActionError(error?.message || "Unable to start payment right now.");
      setPaymentLoading(false);
    }
  };

  return (
    <section className="session-detail">
      <div className="event-detail-card">
        <NavLink className="event-back" to="/sessions">
          &larr; Back to Sessions
        </NavLink>

        <header className="event-detail-header">
          <p className="eyebrow">Session detail</p>
          <h1>{session.title || "Untitled session"}</h1>
          <p>{summary || "A long-running session hosted through BoxtoBox."}</p>
        </header>

        <div className="event-detail-layout">
          <div className="event-detail-poster">
            {imageUrl ? (
              <img className="event-poster-image" src={imageUrl} alt={session.title || "Session poster"} />
            ) : (
              <div className="event-poster-placeholder">
                {(session.title || "Session").trim()[0]?.toUpperCase() || "S"}
              </div>
            )}
          </div>

          <div className="event-detail-info">
            <div className="session-detail-status-card">
              <div className={`session-status-pill session-status-pill-large${session.registration_open ? " open" : ""}`}>
                {getSessionStatusLabel(session)}
              </div>
              <div className="session-price-row">
                <span className={`session-price-pill${paid ? " paid" : ""}`}>
                  {getSessionPricingLabel(session)}
                </span>
                <strong>{formatSessionPrice(session)}</strong>
              </div>
              <p>
                {session.registration_open
                  ? "Session is Open"
                  : "Session is currently closed, check back later"}
              </p>
            </div>

            <div className="event-detail-actions">
              <div className="event-action-row">
                <div>
                  <p className="event-action-title">Join session</p>
                  <p className="event-action-subtitle">
                    {paid ? `Entry fee: ${formatSessionPrice(session)}` : "Free session"}
                  </p>
                </div>
                {paid ? (
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={paymentLoading || isPaid || !registrationOpen || !hasSpots}
                    onClick={handlePayClick}
                  >
                    {isPaid
                      ? "Paid"
                      : paymentLoading
                      ? "Processing..."
                      : !registrationOpen
                      ? "Registration closed"
                      : !hasSpots
                      ? "Sold out"
                      : "Pay with Paystack"}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={accountLoading || isRegistered || !registrationOpen || !hasSpots}
                    onClick={handleRegisterClick}
                  >
                    {isRegistered
                      ? "Registered"
                      : accountLoading
                      ? "Checking..."
                      : !registrationOpen
                      ? "Registration closed"
                      : !hasSpots
                      ? "Sold out"
                      : "Register Free"}
                  </button>
                )}
              </div>
              {actionError ? <p className="event-action-error">{actionError}</p> : null}
              {actionMessage ? <p className="event-action-success">{actionMessage}</p> : null}
              {!authUser ? (
                <p className="event-action-note">
                  Sign in to {paid ? "pay for" : "register for"} this session.
                </p>
              ) : paid && !isPaid ? (
                <p className="event-action-note">
                  Payments are processed securely with Paystack. You will return here automatically after checkout.
                </p>
              ) : null}
            </div>

            <div className="event-detail-grid">
              <div className="event-detail-item">
                <p className="label">Starts</p>
                <p>{formatSessionDate(session.session_date)}</p>
              </div>
              <div className="event-detail-item">
                <p className="label">Location</p>
                <p>{formatSessionLocation(session)}</p>
              </div>
              <div className="event-detail-item">
                <p className="label">Host</p>
                <p>{session.host_name || "BoxtoBox host"}</p>
              </div>
              <div className="event-detail-item">
                <p className="label">Duration</p>
                <p>{formatSessionDuration(session.duration_hours)}</p>
              </div>
              <div className="event-detail-item">
                <p className="label">Remaining spots</p>
                <p>{session.remaining_places ?? 0}</p>
              </div>
            </div>
          </div>
        </div>

        <section className="event-detail-body">
          <details className="session-disclosure">
            <summary className="session-disclosure-summary">
              <div>
                <h2>About the session</h2>
                <p>Overview, format, and rules.</p>
              </div>
              <span className="session-disclosure-toggle" aria-hidden="true">+</span>
            </summary>
            <div className="session-disclosure-content">
              <p>{session.overview || summary || "More session details will appear here soon."}</p>
              {session.format ? (
                <>
                  <h3>Format</h3>
                  <p>{session.format}</p>
                </>
              ) : null}
              {rules.length ? (
                <>
                  <h3>Rules</h3>
                  <ul>
                    {rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </details>
        </section>

        <section className="event-detail-body">
          <details className="session-disclosure">
            <summary className="session-disclosure-summary">
              <div>
                <h2>Registered users</h2>
                <p>See who is currently signed up.</p>
              </div>
              <div className="session-disclosure-meta">
                <span className="session-disclosure-toggle" aria-hidden="true">+</span>
              </div>
            </summary>
            <div className="session-disclosure-content">
              {registeredUsers.length ? (
                <ul className="session-users-grid">
                  {registeredUsers.map((user) => (
                    <RegisteredUserCard key={user.id} user={user} />
                  ))}
                </ul>
              ) : (
                <div className="session-users-empty">
                  <p>No one has registered for this session yet.</p>
                </div>
              )}
            </div>
          </details>
        </section>
      </div>
    </section>
  );
}
