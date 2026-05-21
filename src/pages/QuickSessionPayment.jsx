import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";
import { getAuthUser, observeAuthState } from "../lib/auth.js";
import {
  formatSessionPrice,
  getRegisteredUsers,
  isPaidSession,
} from "../lib/sessions.js";

function parseDateValue(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function safeGetAuthUser() {
  try {
    return getAuthUser();
  } catch (error) {
    return null;
  }
}

function openAuthModal() {
  window.dispatchEvent(new CustomEvent("auth:open", {
    detail: { mode: "signin", signInOnly: true },
  }));
}

export default function QuickSessionPayment() {
  const { id } = useParams();
  const [authUser, setAuthUser] = useState(() => safeGetAuthUser());
  const [session, setSession] = useState(null);
  const [accountState, setAccountState] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountStateLoaded, setAccountStateLoaded] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Preparing payment...");
  const [errorMessage, setErrorMessage] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const authPromptedRef = useRef(false);
  const paymentStartedRef = useRef("");

  useEffect(() => {
    let unsubscribe = null;
    try {
      unsubscribe = observeAuthState((user) => {
        setAuthUser(user || null);
      });
    } catch (error) {
      setAuthUser(null);
    }
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadSession() {
      if (!id) {
        setSession(null);
        setSessionLoading(false);
        setErrorMessage("Session not found.");
        setStatusMessage("");
        return;
      }

      setSessionLoading(true);
      setAccountStateLoaded(false);
      setErrorMessage("");
      setStatusMessage("Loading session...");
      try {
        const data = await apiRequest(`/v2/session/${encodeURIComponent(id)}`, { authRequired: false });
        if (!isActive) {
          return;
        }
        setSession(data || null);
        setStatusMessage("Confirming payment details...");
      } catch (error) {
        if (!isActive) {
          return;
        }
        setSession(null);
        setErrorMessage(error?.message || "Unable to load this session right now.");
        setStatusMessage("");
      } finally {
        if (isActive) {
          setSessionLoading(false);
        }
      }
    }

    loadSession();
    return () => {
      isActive = false;
    };
  }, [id]);

  useEffect(() => {
    let isActive = true;
    const accountId = authUser?.uid || "";

    if (!id || !accountId) {
      setAccountState(null);
      setAccountLoading(false);
      setAccountStateLoaded(false);
      return () => {
        isActive = false;
      };
    }

    async function loadAccountState() {
      setAccountLoading(true);
      setAccountStateLoaded(false);
      try {
        const data = await apiRequest(`/v2/session/${encodeURIComponent(id)}/account_states`, {
          query: { account_id: accountId },
        });
        if (isActive) {
          setAccountState(data || null);
        }
      } catch (error) {
        if (isActive) {
          setAccountState(null);
        }
      } finally {
        if (isActive) {
          setAccountLoading(false);
          setAccountStateLoaded(true);
        }
      }
    }

    loadAccountState();
    return () => {
      isActive = false;
    };
  }, [authUser?.uid, id]);

  const registeredUsers = useMemo(() => getRegisteredUsers(session), [session]);
  const paid = isPaidSession(session || {});
  const paymentStatus = String(accountState?.payment_status || "").toLowerCase();
  const isPaid = Boolean(accountState?.paid) || ["paid", "success", "successful", "completed", "complete"].includes(paymentStatus);
  const isRegisteredInRoster = Boolean(
    authUser?.uid &&
      registeredUsers.some((user) => {
        const status = String(user?.registration_status || "registered").toLowerCase();
        return user?.id === authUser.uid && status === "registered";
      }),
  );
  const isRegistered = Boolean(accountState?.register) || isRegisteredInRoster;
  const isReservedForUser = Boolean(accountState?.reserved_by_host) || String(accountState?.reservation_status || "").toLowerCase() === "reserved";
  const registrationOpen = session?.registration_open !== false;
  const remaining = Number(session?.remaining_places ?? session?.available_places ?? 0);
  const hasSpots = !Number.isFinite(remaining) || remaining > 0;
  const hasPendingPayment = paid && !isPaid && !isRegistered &&
    ["pending", "processing", "initiated", "otp_sent"].includes(paymentStatus);
  const registrationDeadline = parseDateValue(accountState?.registration_deadline || session?.registration_deadline);
  const deadlineHasPassed = Boolean(registrationDeadline && registrationDeadline.getTime() < Date.now());
  const sessionIsInactiveForPayment = Boolean(
    session?.deleted_at ||
      session?.archived_at ||
      session?.session_status === "completed" ||
      !registrationOpen ||
      deadlineHasPassed,
  );

  const blockingMessage = useMemo(() => {
    if (!session) {
      return "";
    }
    if (sessionIsInactiveForPayment) {
      return "This session is not active for payment.";
    }
    if (!paid) {
      return "This session does not require payment.";
    }
    if (isPaid) {
      return "Payment has already been completed.";
    }
    if (isRegistered) {
      return "You are already registered for this session.";
    }
    if (hasPendingPayment) {
      return "Payment is already in progress for this session.";
    }
    if (!hasSpots && !isReservedForUser) {
      return "No spots remaining for this session.";
    }
    if (authUser && !authUser.email) {
      return "A verified email is required before starting payment.";
    }
    return "";
  }, [
    authUser,
    hasPendingPayment,
    hasSpots,
    isPaid,
    isRegistered,
    isReservedForUser,
    paid,
    session,
    sessionIsInactiveForPayment,
  ]);

  const buildPaystackCallbackUrl = () => {
    return `${window.location.origin}${window.location.pathname}#/session/${encodeURIComponent(id)}?paystack=return`;
  };

  useEffect(() => {
    if (sessionLoading || !session || redirecting) {
      return;
    }

    if (!authUser?.uid) {
      setStatusMessage("Sign in to continue to payment.");
      setErrorMessage("");
      if (!authPromptedRef.current) {
        authPromptedRef.current = true;
        openAuthModal();
      }
      return;
    }

    if (accountLoading || !accountStateLoaded) {
      setStatusMessage("Confirming your account...");
      setErrorMessage("");
      return;
    }

    if (blockingMessage) {
      setStatusMessage("");
      setErrorMessage(blockingMessage);
      return;
    }

    const paymentKey = `${id}:${authUser.uid}`;
    if (paymentStartedRef.current === paymentKey) {
      return;
    }
    paymentStartedRef.current = paymentKey;

    async function startPayment() {
      setRedirecting(true);
      setErrorMessage("");
      setStatusMessage("Redirecting to Paystack...");
      try {
        const result = await apiRequest(`/v2.6/session/${encodeURIComponent(id)}/payment/paystack/initialize`, {
          method: "POST",
          body: { callback_url: buildPaystackCallbackUrl() },
        });
        if (!result?.authorization_url) {
          throw new Error("Unable to start Paystack checkout right now.");
        }
        setStatusMessage("Paystack is opening. Please wait...");
        await new Promise((resolve) => window.setTimeout(resolve, 500));
        window.location.assign(result.authorization_url);
      } catch (error) {
        paymentStartedRef.current = "";
        setRedirecting(false);
        setStatusMessage("");
        setErrorMessage(error?.message || "Unable to start payment right now.");
      }
    }

    startPayment();
  }, [
    accountLoading,
    accountStateLoaded,
    authUser?.uid,
    blockingMessage,
    id,
    redirecting,
    session,
    sessionLoading,
  ]);

  const title = session?.title || "Session payment";

  return (
    <section className="session-detail">
      <div className="event-detail-card">
        <NavLink className="event-back" to={id ? `/session/${encodeURIComponent(id)}` : "/sessions"}>
          &larr; Back to Session
        </NavLink>

        <header className="event-detail-header">
          <p className="eyebrow">Quick payment</p>
          <h1>{title}</h1>
          <p>{session ? formatSessionPrice(session) : "Preparing your payment link."}</p>
        </header>

        <div className="event-detail-actions">
          <div className="event-action-row">
            <div>
              <p className="event-action-title">
                {redirecting ? "Opening Paystack" : authUser ? "Login confirmed" : "Login required"}
              </p>
              <p className="event-action-subtitle">
                {authUser?.email || "Sign in to continue with this payment."}
              </p>
            </div>
            <button
              className="btn btn-primary"
              type="button"
              disabled={redirecting || Boolean(authUser)}
              onClick={() => {
                if (!authUser) {
                  openAuthModal();
                }
              }}
            >
              {redirecting ? "Redirecting..." : authUser ? "Confirmed" : "Sign in"}
            </button>
          </div>

          {redirecting ? (
            <div className="quick-payment-redirect" role="status" aria-live="polite">
              <span className="quick-payment-spinner" aria-hidden="true"></span>
              <div>
                <p className="quick-payment-redirect-title">Taking you to Paystack</p>
                <p className="quick-payment-redirect-copy">
                  Keep this page open while your secure checkout loads.
                </p>
              </div>
            </div>
          ) : null}

          {sessionLoading || accountLoading || statusMessage ? (
            <p className="event-action-note">{statusMessage || "Checking payment status..."}</p>
          ) : null}
          {errorMessage ? <p className="event-action-error">{errorMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}
