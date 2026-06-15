import { useEffect, useMemo, useRef, useState } from "react";
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
  getSessionStatusLabel,
  getSessionSummary,
  isPaidSession,
} from "../lib/sessions.js";

function getReservationLabel(user) {
  return String(user?.registration_status || "").toLowerCase() === "reserved" ? "Reserved" : "Registered";
}

function normalizeStatStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function formatMoneyAmount(amount, currency = "NGN") {
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return "Free";
  }

  const resolvedCurrency = typeof currency === "string" && currency.trim()
    ? currency.trim().toUpperCase()
    : "NGN";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: resolvedCurrency,
      maximumFractionDigits: numericAmount % 1 === 0 ? 0 : 2,
    }).format(numericAmount);
  } catch (error) {
    return `${resolvedCurrency} ${numericAmount}`;
  }
}

function formatMembershipPrice(session) {
  return formatMoneyAmount(session?.membership_fee, session?.membership_currency || session?.currency);
}

function formatMembershipDuration(value) {
  const days = Number(value || 0);
  if (!Number.isFinite(days) || days <= 0) {
    return "Duration TBD";
  }
  return `${days} day${days === 1 ? "" : "s"}`;
}

function getDisplayName(player) {
  return player?.name || player?.account_id || player?.id || "Registered player";
}

function sortNomineesByName(players) {
  return [...(players || [])].sort((first, second) =>
    getDisplayName(first).localeCompare(getDisplayName(second), undefined, { sensitivity: "base" }),
  );
}

function RegisteredUserCard({ user, actionLabel = "", onAction = null, actionDisabled = false }) {
  const name = user.name || "Registered user";
  const initial = name.trim() ? name.trim()[0].toUpperCase() : "U";
  const isReserved = String(user?.registration_status || "").toLowerCase() === "reserved";

  return (
    <li className="session-user-card">
      {user.avatar ? (
        <img className="session-user-avatar" src={user.avatar} alt={name} loading="lazy" />
      ) : (
        <div className="session-user-avatar session-user-avatar-fallback">{initial}</div>
      )}
      <div className="session-user-copy">
        <h3>{name}</h3>
        <p>{user.id}</p>
        <div className="session-user-meta">
          <span className={`session-user-status${isReserved ? " reserved" : ""}`}>
            {getReservationLabel(user)}
          </span>
          {onAction ? (
            <button
              className="btn btn-secondary session-user-action"
              type="button"
              disabled={actionDisabled}
              onClick={onAction}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function SessionDetail() {
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

  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState("Loading session...");
  const [authUser, setAuthUser] = useState(() => safeGetAuthUser());
  const [accountState, setAccountState] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [membershipModalOpen, setMembershipModalOpen] = useState(false);
  const [membershipPaymentLoading, setMembershipPaymentLoading] = useState(false);
  const [membershipError, setMembershipError] = useState("");
  const [membershipMessage, setMembershipMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [statsBoard, setStatsBoard] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsSubmitting, setStatsSubmitting] = useState(false);
  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [statsMessage, setStatsMessage] = useState("");
  const [goalsInput, setGoalsInput] = useState("0");
  const [assistsInput, setAssistsInput] = useState("0");
  const [cleanSheetsInput, setCleanSheetsInput] = useState("0");
  const [nomineeAccountId, setNomineeAccountId] = useState("");
  const [activeStatsModal, setActiveStatsModal] = useState(null);
  const autoVerifyKeyRef = useRef("");

  async function loadSession(targetId) {
    if (!targetId) {
      setSession(null);
      setStatus("Session not found.");
      return null;
    }
    setStatus("Loading session...");
    try {
      const data = await apiRequest(`/v2/session/${encodeURIComponent(targetId)}`, {
        authRequired: false,
        cache: "no-store",
        query: { include_stats: "false" },
      });
      setSession(data);
      setStatsBoard((current) => data?.session_stats ? {
        ...data.session_stats,
        current_user_submission: current?.current_user_submission || null,
        current_user_vote: current?.current_user_vote || null,
      } : current);
      if (!nomineeAccountId && Array.isArray(data?.session_stats?.leaderboard) && data.session_stats.leaderboard.length) {
        setNomineeAccountId(sortNomineesByName(data.session_stats.leaderboard)[0]?.account_id || "");
      }
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
    if (!accountId || !targetId) {
      setAccountState(null);
      return null;
    }

    setAccountLoading(true);
    try {
      const data = await apiRequest(`/v2/session/${encodeURIComponent(targetId)}/account_states`, {
        query: { account_id: accountId },
      });
      setAccountState(data || null);
      return data || null;
    } catch (error) {
      setAccountState(null);
      return null;
    } finally {
      setAccountLoading(false);
    }
  }

  async function fetchSessionStats(targetId) {
    if (!targetId || !authUser?.uid) {
      setStatsBoard(null);
      return null;
    }

    setStatsLoading(true);
    setStatsError("");
    try {
      const data = await apiRequest(`/v2/session/${encodeURIComponent(targetId)}/stats`, {
        query: { account_id: authUser.uid },
      });
      setStatsBoard(data || null);
      const submission = data?.current_user_submission;
      if (submission && normalizeStatStatus(submission.status) !== "rejected") {
        setGoalsInput(String(Number(submission.goals || 0)));
        setAssistsInput(String(Number(submission.assists || 0)));
        setCleanSheetsInput(String(Number(submission.clean_sheets || 0)));
      }
      const vote = data?.current_user_vote;
      if (vote?.nominee_account_id) {
        setNomineeAccountId(vote.nominee_account_id);
      } else if (!nomineeAccountId && Array.isArray(data?.leaderboard) && data.leaderboard.length) {
        setNomineeAccountId(sortNomineesByName(data.leaderboard)[0]?.account_id || "");
      }
      return data || null;
    } catch (error) {
      setStatsBoard(null);
      setStatsError(error?.message || "Unable to load session stats right now.");
      return null;
    } finally {
      setStatsLoading(false);
    }
  }

  async function fetchPlayerActions(targetId) {
    if (!targetId || !authUser?.uid) {
      setStatsBoard((current) => current ? {
        ...current,
        current_user_submission: null,
        current_user_vote: null,
      } : session?.session_stats || null);
      return null;
    }

    setStatsLoading(true);
    setStatsError("");
    try {
      const data = await apiRequest(`/v2/session/${encodeURIComponent(targetId)}/player-actions`, {
        query: { account_id: authUser.uid },
      });
      setStatsBoard((current) => ({
        ...(session?.session_stats || current || {}),
        current_user_submission: data?.current_user_submission || null,
        current_user_vote: data?.current_user_vote || null,
      }));
      const submission = data?.current_user_submission;
      if (submission && normalizeStatStatus(submission.status) !== "rejected") {
        setGoalsInput(String(Number(submission.goals || 0)));
        setAssistsInput(String(Number(submission.assists || 0)));
        setCleanSheetsInput(String(Number(submission.clean_sheets || 0)));
      }
      const vote = data?.current_user_vote;
      if (vote?.nominee_account_id) {
        setNomineeAccountId(vote.nominee_account_id);
      } else if (!nomineeAccountId) {
        const sourceLeaderboard = session?.session_stats?.leaderboard || statsBoard?.leaderboard || [];
        if (sourceLeaderboard.length) {
          setNomineeAccountId(sortNomineesByName(sourceLeaderboard)[0]?.account_id || "");
        }
      }
      return data || null;
    } catch (error) {
      return fetchSessionStats(targetId);
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    let unsubscribe = null;
    try {
      unsubscribe = observeAuthState((user) => {
        setAuthUser(user || null);
        if (id && user?.uid) {
          fetchAccountState(id, user.uid);
        } else {
          setAccountState(null);
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
  }, [id]);

  useEffect(() => {
    loadSession(id);
  }, [id]);

  useEffect(() => {
    if (id && authUser?.uid) {
      fetchAccountState(id, authUser.uid);
      return;
    }
    setAccountState(null);
    setStatsBoard(session?.session_stats || null);
  }, [authUser?.uid, id]);

  useEffect(() => {
    const paystackReturn = searchParams.get("paystack");
    const paymentFlow = searchParams.get("payment") || "session";
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    const accountId = authUser?.uid || "";
    if (paystackReturn !== "return" || paymentFlow === "membership" || !reference || !id || !accountId) {
      return;
    }

    let isActive = true;

    async function verifyReturnedPayment() {
      setPaymentLoading(true);
      setActionError("");
      setActionMessage("Verifying payment...");
      try {
        const result = await apiRequest(`/v2.5/session/${encodeURIComponent(id)}/payment/paystack/verify`, {
          method: "POST",
          authRequired: false,
          body: { reference, account_id: accountId },
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
        if (error?.status === 409 && error?.payload && typeof error.payload === "object") {
          await Promise.all([loadSession(id), fetchAccountState(id, accountId)]);
          setActionMessage(error.payload.message || "Payment confirmed, but registration still needs attention.");
          setSearchParams({}, { replace: true });
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
  const membershipRequired = Boolean(session?.membership_required || accountState?.membership_required);
  const membershipStatus = String(accountState?.membership_status || "").toLowerCase();
  const membershipActive = Boolean(accountState?.membership_active) || membershipStatus === "active";
  const membershipPrice = formatMembershipPrice(session || {});
  const membershipDuration = formatMembershipDuration(session?.membership_period_days);
  const showMembershipOption = membershipRequired && !membershipActive;
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
  const sessionEligibleForAutoVerify = Boolean(
    registrationOpen &&
    !deadlineHasPassed &&
    session?.session_status !== "completed" &&
    hasSpots,
  );
  const sessionStats = session?.session_stats || statsBoard || null;
  const currentSubmission = statsBoard?.current_user_submission || null;
  const currentSubmissionStatus = normalizeStatStatus(currentSubmission?.status);
  const hasCurrentVote = Boolean(statsBoard?.current_user_vote?.nominee_account_id);
  const nominees = useMemo(() => {
    const leaderboard = sessionStats?.leaderboard || [];
    if (leaderboard.length) {
      return sortNomineesByName(leaderboard);
    }
    return sortNomineesByName(sessionStats?.participants || []);
  }, [sessionStats]);
  const isStatsParticipant = Boolean(
    authUser?.uid &&
      (
        sessionStats?.participants?.some((player) => player?.id === authUser.uid || player?.account_id === authUser.uid) ||
        sessionStats?.leaderboard?.some((player) => player?.account_id === authUser.uid || player?.id === authUser.uid)
      ),
  );
  const canUseSessionPlayerActions = isRegistered || isStatsParticipant;
  const selectedVoteName = useMemo(() => {
    const selectedId = statsBoard?.current_user_vote?.nominee_account_id || nomineeAccountId;
    const nominee = nominees.find((player) => player.account_id === selectedId || player.id === selectedId);
    return nominee ? getDisplayName(nominee) : selectedId;
  }, [nomineeAccountId, nominees, statsBoard?.current_user_vote?.nominee_account_id]);
  const canSubmitStats = Boolean(
    canUseSessionPlayerActions &&
    session?.stats_open &&
    (!currentSubmission || currentSubmissionStatus === "rejected"),
  );
  const canVotePlayerOfWeek = Boolean(
    canUseSessionPlayerActions &&
    session?.voting_open &&
    !hasCurrentVote &&
    nominees.length,
  );
  const currentCleanSheets = currentSubmission?.clean_sheets ?? 0;
  const submitStatsDescription = currentSubmissionStatus === "confirmed"
    ? `Confirmed: ${currentSubmission?.goals ?? 0} goals, ${currentSubmission?.assists ?? 0} assists, ${currentCleanSheets} clean sheets.`
    : currentSubmissionStatus === "pending"
    ? `Pending review: ${currentSubmission?.goals ?? 0} goals, ${currentSubmission?.assists ?? 0} assists, ${currentCleanSheets} clean sheets.`
    : currentSubmissionStatus === "rejected"
    ? "Your last submission was rejected. You can submit again."
    : session?.stats_open
    ? "Enter your goals, assists, and clean sheets for this session."
    : "Stats are closed for this session.";
  const voteDescription = hasCurrentVote
    ? `You voted for ${selectedVoteName || "a registered player"}.`
    : session?.voting_open
    ? "Choose one registered player. Self-votes are allowed."
    : "Player of the Week voting is closed.";

  useEffect(() => {
    if (id && authUser?.uid) {
      fetchPlayerActions(id);
      return;
    }
    setStatsBoard(session?.session_stats || null);
    setStatsError("");
    setStatsMessage("");
  }, [authUser?.uid, id]);

  useEffect(() => {
    const paystackReturn = searchParams.get("paystack");
    const accountId = authUser?.uid || "";
    const reference = String(accountState?.payment_reference || "").trim();
    if (!id || !accountId || !hasPendingPayment || !reference) {
      autoVerifyKeyRef.current = "";
      return;
    }
    if (!sessionEligibleForAutoVerify) {
      autoVerifyKeyRef.current = "";
      return;
    }
    if (paystackReturn === "return") {
      return;
    }

    const nextKey = `${id}:${reference}`;
    if (autoVerifyKeyRef.current === nextKey) {
      return;
    }
    autoVerifyKeyRef.current = nextKey;

    let isActive = true;

    async function verifyPendingPaymentOnLoad() {
      setPaymentLoading(true);
      setActionError("");
      setActionMessage("Confirming your payment...");
      try {
        const result = await apiRequest(`/v2.5/session/${encodeURIComponent(id)}/payment/paystack/verify`, {
          method: "POST",
          authRequired: false,
          body: {
            reference,
            account_id: accountId,
            payment_date: accountState?.payment_transaction_date || "",
            transaction_id: accountState?.payment_transaction_id || "",
          },
        });
        if (!isActive) {
          return;
        }
        await Promise.all([loadSession(id), fetchAccountState(id, accountId)]);
        if (result?.registered) {
          setActionMessage("Payment confirmed and your session spot is secured.");
          autoVerifyKeyRef.current = "";
          return;
        }
        setActionMessage(result?.message || "Your payment is still being confirmed. Reload this page in a moment if your registration has not updated yet.");
      } catch (error) {
        if (!isActive) {
          return;
        }
        if (error?.status === 409 && error?.payload && typeof error.payload === "object") {
          await Promise.all([loadSession(id), fetchAccountState(id, accountId)]);
          setActionMessage(error.payload.message || "Payment confirmed, but registration could not be completed.");
          autoVerifyKeyRef.current = "";
          return;
        }
        setActionMessage("Your payment is still being confirmed. Reload this page in a moment if your registration has not updated yet.");
      } finally {
        if (isActive) {
          setPaymentLoading(false);
        }
      }
    }

    verifyPendingPaymentOnLoad();
    return () => {
      isActive = false;
    };
  }, [
    accountState?.payment_reference,
    accountState?.payment_transaction_date,
    accountState?.payment_transaction_id,
    authUser?.uid,
    hasPendingPayment,
    id,
    searchParams,
    sessionEligibleForAutoVerify,
  ]);

  useEffect(() => {
    const paystackReturn = searchParams.get("paystack");
    const paymentFlow = searchParams.get("payment");
    const reference = searchParams.get("reference") || searchParams.get("trxref");
    const accountId = authUser?.uid || "";
    if (paystackReturn !== "return" || paymentFlow !== "membership" || !reference || !id || !accountId) {
      return;
    }

    let isActive = true;

    async function verifyReturnedMembershipPayment() {
      setMembershipPaymentLoading(true);
      setMembershipError("");
      setMembershipMessage("Verifying membership payment...");
      try {
        const result = await apiRequest(`/v2.5/session/${encodeURIComponent(id)}/membership/paystack/verify`, {
          method: "POST",
          body: { reference, account_id: accountId },
        });
        if (!isActive) {
          return;
        }
        await Promise.all([loadSession(id), fetchAccountState(id, accountId)]);
        const membershipEndAt = result?.membership_end_at ? formatSessionDate(result.membership_end_at) : "";
        setMembershipMessage(
          membershipEndAt
            ? `Membership confirmed. Active until ${membershipEndAt}.`
            : result?.message || "Membership confirmed.",
        );
        setSearchParams({}, { replace: true });
      } catch (error) {
        if (!isActive) {
          return;
        }
        setMembershipError(error?.message || "Unable to verify your membership payment right now.");
      } finally {
        if (isActive) {
          setMembershipPaymentLoading(false);
        }
      }
    }

    verifyReturnedMembershipPayment();
    return () => {
      isActive = false;
    };
  }, [authUser?.uid, id, searchParams, setSearchParams]);

  const openAuthModal = (mode = "signin", options = {}) => {
    window.dispatchEvent(new CustomEvent("auth:open", { detail: { mode, ...options } }));
  };

  const buildPaystackCallbackUrl = () => {
    const hashPath = (window.location.hash || `#/session/${encodeURIComponent(id)}`).split("?")[0];
    return `${window.location.origin}${window.location.pathname}${hashPath}?paystack=return`;
  };

  const buildMembershipPaystackCallbackUrl = () => {
    const hashPath = (window.location.hash || `#/session/${encodeURIComponent(id)}`).split("?")[0];
    return `${window.location.origin}${window.location.pathname}${hashPath}?paystack=return&payment=membership`;
  };

  const handleOpenMembershipModal = () => {
    setMembershipError("");
    setMembershipMessage("");
    setMembershipModalOpen(true);
  };

  const handleMembershipPayClick = async () => {
    setMembershipError("");
    setMembershipMessage("");
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
      setMembershipError("A verified email is required before starting membership payment.");
      return;
    }

    try {
      setMembershipPaymentLoading(true);
      const result = await apiRequest(`/v2.5/session/${encodeURIComponent(id)}/membership/paystack/initialize`, {
        method: "POST",
        body: {
          account_id: accountId,
          email: user.email,
          callback_url: buildMembershipPaystackCallbackUrl(),
        },
      });

      if (!result?.authorization_url) {
        throw new Error("Unable to start Paystack checkout right now.");
      }

      window.location.assign(result.authorization_url);
    } catch (error) {
      setMembershipError(error?.message || "Unable to start membership payment right now.");
      setMembershipPaymentLoading(false);
    }
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
    if ((!registrationOpen || (!hasSpots && !isReservedForUser)) && !isRegistered) {
      return;
    }

    try {
      await apiRequest(`/v2/session/${encodeURIComponent(id)}/register`, {
        method: "POST",
        body: { account_id: accountId },
      });
      await Promise.all([loadSession(id), fetchAccountState(id, accountId)]);
      setActionMessage(isReservedForUser ? "Your reserved spot is now claimed." : "You are registered for this session.");
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
      const result = await apiRequest(`/v2.5/session/${encodeURIComponent(id)}/payment/paystack/initialize`, {
        method: "POST",
        authRequired: false,
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

  const handleSubmitStats = async (event) => {
    event.preventDefault();
    setStatsError("");
    setStatsMessage("");

    if (!id || !canUseSessionPlayerActions) {
      setStatsError("You need to be registered for this session before submitting stats.");
      return;
    }
    if (!session?.stats_open) {
      setStatsError("Stats are not open for this session yet.");
      return;
    }

    const goals = Number(goalsInput);
    const assists = Number(assistsInput);
    const cleanSheets = Number(cleanSheetsInput);
    if (
      !Number.isInteger(goals) ||
      goals < 0 ||
      !Number.isInteger(assists) ||
      assists < 0 ||
      !Number.isInteger(cleanSheets) ||
      cleanSheets < 0
    ) {
      setStatsError("Goals, assists, and clean sheets must be whole numbers of 0 or more.");
      return;
    }

    try {
      setStatsSubmitting(true);
      await apiRequest(`/v2/session/${encodeURIComponent(id)}/stats/submit`, {
        method: "POST",
        body: { goals, assists, clean_sheets: cleanSheets },
      });
      await loadSession(id);
      await fetchPlayerActions(id);
      setStatsMessage("Stats submitted. The host will review them.");
      setActiveStatsModal(null);
    } catch (error) {
      setStatsError(error?.message || "Unable to submit stats right now.");
    } finally {
      setStatsSubmitting(false);
    }
  };

  const handleVotePlayerOfWeek = async (event) => {
    event.preventDefault();
    setStatsError("");
    setStatsMessage("");

    if (!id || !canUseSessionPlayerActions) {
      setStatsError("You need to be registered for this session before voting.");
      return;
    }
    if (!session?.voting_open) {
      setStatsError("Player of the Week voting is not open right now.");
      return;
    }
    if (!nomineeAccountId) {
      setStatsError("Choose a player to vote for.");
      return;
    }

    try {
      setVoteSubmitting(true);
      await apiRequest(`/v2/session/${encodeURIComponent(id)}/player-of-week/vote`, {
        method: "POST",
        body: { nominee_account_id: nomineeAccountId },
      });
      await loadSession(id);
      await fetchPlayerActions(id);
      setStatsMessage("Vote submitted.");
      setActiveStatsModal(null);
    } catch (error) {
      setStatsError(error?.message || "Unable to submit your vote right now.");
    } finally {
      setVoteSubmitting(false);
    }
  };

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
                <strong>{formatSessionPrice(session)}</strong>
              </div>
              <p>
                {session.registration_open
                  ? "Session is Open"
                  : "Session is currently closed, check back later"}
              </p>
            </div>

            {showMembershipOption ? (
              <div className="event-detail-actions session-membership-action">
                <div className="event-action-row">
                  <div>
                    <p className="event-action-title">Become a member</p>
                    <p className="event-action-subtitle">
                      Membership required for this session: {membershipPrice} for {membershipDuration}.
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={membershipPaymentLoading}
                    onClick={handleOpenMembershipModal}
                  >
                    {membershipPaymentLoading ? "Processing..." : "Become a member"}
                  </button>
                </div>
                {membershipError ? <p className="event-action-error">{membershipError}</p> : null}
                {membershipMessage ? <p className="event-action-success">{membershipMessage}</p> : null}
                {!authUser ? (
                  <p className="event-action-note">Sign in to buy this membership before joining the session.</p>
                ) : (
                  <p className="event-action-note">Membership checkout is processed securely with Paystack.</p>
                )}
              </div>
            ) : null}

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
                    disabled={paymentLoading || isPaid || hasPendingPayment || sessionIsInactiveForPayment || (!hasSpots && !isReservedForUser)}
                    onClick={handlePayClick}
                  >
                    {isPaid
                      ? "Paid"
                      : paymentLoading
                      ? "Processing..."
                      : hasPendingPayment
                      ? "Payment being confirmed"
                      : sessionIsInactiveForPayment
                      ? "Registration closed"
                      : !hasSpots && !isReservedForUser
                      ? "Sold out"
                      : isReservedForUser
                      ? "Pay & claim reserved spot"
                      : "Pay with Paystack"}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={accountLoading || isRegistered || !registrationOpen || (!hasSpots && !isReservedForUser)}
                    onClick={handleRegisterClick}
                  >
                    {isRegistered
                      ? "Registered"
                      : accountLoading
                      ? "Checking..."
                      : !registrationOpen
                      ? "Registration closed"
                      : !hasSpots && !isReservedForUser
                      ? "Sold out"
                      : isReservedForUser
                      ? "Claim reserved spot"
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
              ) : paymentLoading && hasPendingPayment ? (
                <p className="event-action-note session-payment-attention">
                  Confirming your payment...
                </p>
              ) : hasPendingPayment ? (
                <p className="event-action-note session-payment-attention">
                  Your payment is still being confirmed. Reload this page in a moment if your registration has not updated yet.
                </p>
              ) : isReservedForUser ? (
                <p className="event-action-note">
                  This session host has reserved a spot for your account. Complete the claim flow to secure it.
                </p>
              ) : paid && !isPaid ? (
                <p className="event-action-note">
                  Payments are processed securely with Paystack. You will return here automatically after checkout.
                </p>
              ) : null}
            </div>

            {membershipModalOpen ? (
              <div className="session-action-modal-overlay" role="presentation" onClick={() => setMembershipModalOpen(false)}>
                <div
                  className="session-action-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="membership-payment-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="session-action-modal-header">
                    <div>
                      <p className="payment-eyebrow">Membership</p>
                      <h2 id="membership-payment-title">Become a Member</h2>
                    </div>
                    <button
                      className="payment-close"
                      type="button"
                      aria-label="Close membership payment"
                      onClick={() => setMembershipModalOpen(false)}
                    >
                      ×
                    </button>
                  </div>
                  <p className="event-action-subtitle">
                    Buy the membership required for {session.title || "this session"}.
                  </p>
                  <div className="membership-modal-details">
                    <div>
                      <p className="label">Price</p>
                      <p>{membershipPrice}</p>
                    </div>
                    <div>
                      <p className="label">Duration</p>
                      <p>{membershipDuration}</p>
                    </div>
                  </div>
                  {membershipError ? <p className="event-action-error">{membershipError}</p> : null}
                  {membershipMessage ? <p className="event-action-success">{membershipMessage}</p> : null}
                  <button
                    className="btn btn-primary membership-payment-button"
                    type="button"
                    disabled={membershipPaymentLoading}
                    onClick={handleMembershipPayClick}
                  >
                    {!authUser
                      ? "Sign in to pay"
                      : membershipPaymentLoading
                      ? "Opening checkout..."
                      : "Pay with Paystack"}
                  </button>
                </div>
              </div>
            ) : null}

            {authUser && (canUseSessionPlayerActions || statsLoading) ? (
              <div className="event-detail-actions session-player-actions">
                <div className="event-action-row">
                  <div>
                    <p className="event-action-title">Session player actions</p>
                    <p className="event-action-subtitle">
                      Submit your football stats and vote for Player of the Week when each action opens.
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={statsLoading}
                    onClick={() => fetchPlayerActions(id)}
                  >
                    {statsLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                <div className="session-stats-actions-grid">
                  <div className="session-stats-action-panel">
                    <div>
                      <p className="event-action-title">Submit Stats</p>
                      <p className="event-action-subtitle">{submitStatsDescription}</p>
                    </div>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={!session?.stats_open}
                      onClick={() => setActiveStatsModal("stats")}
                    >
                      {currentSubmissionStatus === "confirmed"
                        ? "View Stats"
                        : currentSubmissionStatus === "rejected"
                        ? "Resubmit Stats"
                        : "Submit Stats"}
                    </button>
                  </div>

                  <div className="session-stats-action-panel">
                    <div>
                      <p className="event-action-title">Vote Player of the Week</p>
                      <p className="event-action-subtitle">{voteDescription}</p>
                    </div>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={!session?.voting_open || !nominees.length}
                      onClick={() => setActiveStatsModal("vote")}
                    >
                      {hasCurrentVote ? "View Vote" : "Vote"}
                    </button>
                  </div>
                </div>

                {statsError ? <p className="event-action-error">{statsError}</p> : null}
                {statsMessage ? <p className="event-action-success">{statsMessage}</p> : null}
                {statsLoading && !statsBoard ? (
                  <p className="event-action-note">Loading session player actions...</p>
                ) : null}
              </div>
            ) : authUser ? (
              <div className="event-detail-actions session-player-actions">
                <div className="event-action-row">
                  <div>
                    <p className="event-action-title">Session player actions</p>
                    <p className="event-action-subtitle">
                      Register for this session or join the most recent occurrence to submit stats and vote for Player of the Week.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {activeStatsModal === "stats" ? (
              <div className="session-action-modal-overlay" role="presentation" onClick={() => setActiveStatsModal(null)}>
                <div
                  className="session-action-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="submit-stats-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="session-action-modal-header">
                    <div>
                      <p className="payment-eyebrow">Session stats</p>
                      <h2 id="submit-stats-title">Submit Stats</h2>
                    </div>
                    <button
                      className="payment-close"
                      type="button"
                      aria-label="Close submit stats"
                      onClick={() => setActiveStatsModal(null)}
                    >
                      ×
                    </button>
                  </div>
                  <p className="event-action-subtitle">{submitStatsDescription}</p>
                  <form className="session-action-modal-form" onSubmit={handleSubmitStats}>
                    <div className="session-stats-input-grid">
                      <label className="payment-field">
                        Goals
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={goalsInput}
                          disabled={!canSubmitStats || statsSubmitting}
                          onChange={(event) => setGoalsInput(event.target.value)}
                        />
                      </label>
                      <label className="payment-field">
                        Assists
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={assistsInput}
                          disabled={!canSubmitStats || statsSubmitting}
                          onChange={(event) => setAssistsInput(event.target.value)}
                        />
                      </label>
                      <label className="payment-field">
                        Clean Sheets
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={cleanSheetsInput}
                          disabled={!canSubmitStats || statsSubmitting}
                          onChange={(event) => setCleanSheetsInput(event.target.value)}
                        />
                      </label>
                    </div>
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={!canSubmitStats || statsSubmitting}
                    >
                      {statsSubmitting ? "Submitting..." : currentSubmissionStatus === "rejected" ? "Resubmit Stats" : "Submit Stats"}
                    </button>
                  </form>
                </div>
              </div>
            ) : null}

            {activeStatsModal === "vote" ? (
              <div className="session-action-modal-overlay" role="presentation" onClick={() => setActiveStatsModal(null)}>
                <div
                  className="session-action-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="vote-player-title"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="session-action-modal-header">
                    <div>
                      <p className="payment-eyebrow">Player of the Week</p>
                      <h2 id="vote-player-title">Cast Your Vote</h2>
                    </div>
                    <button
                      className="payment-close"
                      type="button"
                      aria-label="Close player of the week vote"
                      onClick={() => setActiveStatsModal(null)}
                    >
                      ×
                    </button>
                  </div>
                  <p className="event-action-subtitle">{voteDescription}</p>
                  <form className="session-action-modal-form" onSubmit={handleVotePlayerOfWeek}>
                    <label className="payment-field">
                      Player
                      <select
                        className="session-stats-select"
                        value={nomineeAccountId}
                        disabled={!canVotePlayerOfWeek || voteSubmitting}
                        onChange={(event) => setNomineeAccountId(event.target.value)}
                      >
                        {nominees.length ? (
                          nominees.map((player) => (
                            <option key={player.account_id || player.id} value={player.account_id || player.id}>
                              {getDisplayName(player)}
                            </option>
                          ))
                        ) : (
                          <option value="">No registered players</option>
                        )}
                      </select>
                    </label>
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={!canVotePlayerOfWeek || voteSubmitting}
                    >
                      {voteSubmitting ? "Submitting..." : "Vote"}
                    </button>
                  </form>
                </div>
              </div>
            ) : null}

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
                <strong>{session.going ?? registeredUsers.length}</strong>
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
