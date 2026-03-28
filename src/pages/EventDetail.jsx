import { useEffect, useMemo, useState } from "react";
import { NavLink, useParams, useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";
import { getAuthUser, observeAuthState } from "../lib/auth.js";

const API_BASE = "https://us-central1-boxtobox-fa0e1.cloudfunctions.net/api";
const APPLE_APP_URL = "https://apps.apple.com/gb/app/boxtobox/id6756844810";
const GOOGLE_PLAY_URL = "https://play.google.com/store/apps/details?id=me.boxtobox.boxtobox&pli=1";

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
  const source = event.rules ?? event.rulebook ?? event.rules_text ?? [];

  if (Array.isArray(source)) {
    return source
      .map((rule) => (typeof rule === "string" ? rule.trim() : ""))
      .filter(Boolean);
  }

  if (typeof source === "string") {
    const normalized = source.trim();
    return normalized ? [normalized] : [];
  }

  return [];
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

function getArrayCandidate(source, keys) {
  for (const key of keys) {
    if (Array.isArray(source?.[key])) {
      return source[key];
    }
  }
  return [];
}

function getStringCandidate(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function getNumberCandidate(source, keys) {
  for (const key of keys) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function getBooleanCandidate(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "boolean") {
      return value;
    }
  }
  return null;
}

function compareNullableNumbersDescending(left, right) {
  if (Number.isFinite(left) && Number.isFinite(right)) {
    return right - left;
  }
  if (Number.isFinite(left)) {
    return -1;
  }
  if (Number.isFinite(right)) {
    return 1;
  }
  return 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getObjectCandidate(source, keys) {
  for (const key of keys) {
    const value = source?.[key];
    if (isPlainObject(value)) {
      return value;
    }
  }
  return null;
}

function getGroupDocumentList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const arrayCandidate = getArrayCandidate(payload, [
    "groups",
    "results",
    "data",
    "group_stage_groups",
    "groupStageGroups",
  ]);
  if (arrayCandidate.length) {
    return arrayCandidate;
  }

  const objectCandidate = getObjectCandidate(payload, [
    "groups",
    "results",
    "data",
    "group_stage_groups",
    "groupStageGroups",
  ]);
  if (objectCandidate) {
    return Object.entries(objectCandidate).map(([id, value]) =>
      isPlainObject(value) ? { id, ...value } : { id, value },
    );
  }

  return [];
}

function getGroupRowSource(group) {
  const directArray = getArrayCandidate(group, [
    "rows",
    "standings",
    "table",
    "participants",
    "teams",
    "members",
    "entries",
  ]);
  if (directArray.length) {
    return directArray;
  }

  const nestedObject = getObjectCandidate(group, ["participants", "teams", "members", "entries"]);
  if (nestedObject) {
    return Object.entries(nestedObject)
      .filter(([, value]) => isPlainObject(value))
      .map(([id, value]) => ({ id, ...value }));
  }

  return Object.entries(group)
    .filter(([key, value]) => /^\d+$/.test(key) && isPlainObject(value))
    .map(([id, value]) => ({ id, ...value }));
}

function normalizeGroupStageGroups(payload, defaultQualifiers) {
  const groupSource = getGroupDocumentList(payload);

  return groupSource
    .map((group, groupIndex) => {
      const qualifierCount =
        getNumberCandidate(group, [
          "qualifiers_per_group",
          "qualifiersPerGroup",
          "qualified_count",
          "qualifiedCount",
        ]) ?? defaultQualifiers;
      const rowSource = getGroupRowSource(group);

      const rows = rowSource
        .map((row, rowIndex) => {
          const position = getNumberCandidate(row, ["position", "rank", "place", "seed", "order"]);
          const played = getNumberCandidate(row, [
            "played",
            "matches_played",
            "matchesPlayed",
            "games_played",
            "gamesPlayed",
            "p",
          ]);
          const wins = getNumberCandidate(row, ["wins", "won", "w"]);
          const draws = getNumberCandidate(row, ["draws", "drawn", "d"]);
          const losses = getNumberCandidate(row, ["losses", "lost", "l"]);
          const goalsFor = getNumberCandidate(row, [
            "goals_for",
            "goalsFor",
            "goals_scored",
            "goalsScored",
            "gf",
          ]);
          const goalsAgainst = getNumberCandidate(row, [
            "goals_against",
            "goalsAgainst",
            "goals_conceded",
            "goalsConceded",
            "ga",
          ]);
          const goalDifference =
            getNumberCandidate(row, [
              "goal_difference",
              "goalDifference",
              "gd",
              "goal_diff",
              "goalDiff",
            ]) ??
            (Number.isFinite(goalsFor) && Number.isFinite(goalsAgainst) ? goalsFor - goalsAgainst : null);
          const points = getNumberCandidate(row, ["points", "pts"]);
          const name = getStringCandidate(row, [
            "participant_name",
            "participantName",
            "team_name",
            "teamName",
            "name",
            "player_name",
            "playerName",
            "display_name",
            "displayName",
          ]);
          const qualified =
            getBooleanCandidate(row, [
              "qualified",
              "is_qualified",
              "isQualified",
              "qualified_for_next_stage",
              "qualifiedForNextStage",
            ]) ?? false;

          return {
            id: row?.id || row?.participant_id || row?.participantId || `${groupIndex}-${rowIndex}-${name}`,
            position,
            name: name || `Participant ${rowIndex + 1}`,
            played,
            wins,
            draws,
            losses,
            goalsFor,
            goalsAgainst,
            goalDifference,
            points,
            qualified,
          };
        })
        .filter((row) => row.name);

      const hasExplicitPositions = rows.some((row) => Number.isFinite(row.position));
      const hasStats = rows.some((row) =>
        [
          row.played,
          row.wins,
          row.draws,
          row.losses,
          row.goalsFor,
          row.goalsAgainst,
          row.goalDifference,
          row.points,
        ].some((value) => Number.isFinite(value)),
      );
      const sortedRows = [...rows].sort((left, right) => {
        if (hasExplicitPositions && Number.isFinite(left.position) && Number.isFinite(right.position)) {
          return left.position - right.position;
        }

        return (
          compareNullableNumbersDescending(left.points, right.points) ||
          compareNullableNumbersDescending(left.goalDifference, right.goalDifference) ||
          compareNullableNumbersDescending(left.goalsFor, right.goalsFor) ||
          compareNullableNumbersDescending(left.wins, right.wins) ||
          left.name.localeCompare(right.name)
        );
      });

      return {
        id: group?.id || group?.group_id || group?.groupId || `group-${groupIndex + 1}`,
        name:
          getStringCandidate(group, ["name", "title", "label", "group_name", "groupName"]) ||
          `Group ${String.fromCharCode(65 + (groupIndex % 26))}`,
        qualifierCount,
        hasStats,
        rows: sortedRows.map((row, rowIndex) => ({
          ...row,
          position: Number.isFinite(row.position) ? row.position : rowIndex + 1,
          qualified: row.qualified || (Number.isFinite(qualifierCount) ? rowIndex < qualifierCount : false),
        })),
      };
    })
    .filter((group) => group.rows.length > 0);
}

function formatGroupStat(value) {
  return Number.isFinite(value) ? value : "-";
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
  const [groupStageState, setGroupStageState] = useState({
    status: "idle",
    groups: [],
    error: "",
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
    let isActive = true;

    async function fetchGroupStage(targetId) {
      if (!targetId || !event?.has_group_stage) {
        setGroupStageState({ status: "idle", groups: [], error: "" });
        return;
      }

      setGroupStageState({ status: "loading", groups: [], error: "" });
      try {
        const data = await apiRequest(`/v1.5/event/${encodeURIComponent(targetId)}/group-stage`, {
          authRequired: false,
        });
        if (!isActive) {
          return;
        }
        const groups = normalizeGroupStageGroups(
          data,
          Number(event.group_stage_qualifiers_per_group) || null,
        );
        setGroupStageState({ status: "loaded", groups, error: "" });
      } catch (error) {
        if (!isActive) {
          return;
        }
        setGroupStageState({
          status: "error",
          groups: [],
          error: error?.message || "Unable to load group-stage tables right now.",
        });
      }
    }

    fetchGroupStage(eventId);
    return () => {
      isActive = false;
    };
  }, [event, eventId]);

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
  const rules = event ? getRules(event) : [];
  const hasGroupStage = Boolean(event?.has_group_stage);
  const configuredGroupCount = Number(event?.group_stage_number_of_groups);
  const configuredQualifierCount = Number(event?.group_stage_qualifiers_per_group);
  const groupStageSummary = [
    Number.isFinite(configuredGroupCount) && configuredGroupCount > 0
      ? `${configuredGroupCount} groups`
      : "",
    Number.isFinite(configuredQualifierCount) && configuredQualifierCount > 0
      ? `${configuredQualifierCount} qualifier${configuredQualifierCount === 1 ? "" : "s"} per group`
      : "",
  ]
    .filter(Boolean)
    .join(" . ");
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
  const paidEventRequiresApp = paymentRequired && entryFee > 0 && !isPaid;

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
                {paidEventRequiresApp ? (
                  <a className="btn btn-primary" href={APPLE_APP_URL} target="_blank" rel="noreferrer">
                    Get the app
                  </a>
                ) : (
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={accountLoading || isRegistered || !registrationOpen || !hasSpots}
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
                      : "Register Free"}
                  </button>
                )}
              </div>
              {actionError ? <p className="event-action-error">{actionError}</p> : null}
              {actionMessage ? <p className="event-action-success">{actionMessage}</p> : null}
              {paidEventRequiresApp ? (
                <>
                  <p className="event-action-note">
                    Event payments are temporarily disabled on the website. Use the BoxtoBox app to pay and complete registration.
                  </p>
                  <div className="event-app-links">
                    <a href={GOOGLE_PLAY_URL} target="_blank" rel="noreferrer">
                      <img
                        src="/images/GetItOnGooglePlay_Badge_Web_color_English.png"
                        alt="Get it on Google Play"
                      />
                    </a>
                    <a href={APPLE_APP_URL} target="_blank" rel="noreferrer">
                      <img
                        src="/images/Download_on_the_App_Store_Badge_US-UK_RGB_wht_092917.svg"
                        alt="Download on the App Store"
                      />
                    </a>
                  </div>
                </>
              ) : !safeGetAuthUser() ? (
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
        {rules.length ? (
          <div className="event-detail-body">
            <h2>Rules</h2>
            <ul className="event-detail-list">
              {rules.map((rule, index) => (
                <li key={`${index}-${rule}`}>{rule}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {hasGroupStage ? (
          <div className="event-detail-body">
            <div className="event-group-stage-header">
              <div>
                <h2>Group Stage</h2>
                {groupStageSummary ? <p>{groupStageSummary}</p> : null}
              </div>
              {event?.group_stage_status ? (
                <span className="event-group-stage-badge">
                  {String(event.group_stage_status).replace(/_/g, " ")}
                </span>
              ) : null}
            </div>

            {groupStageState.status === "loading" ? (
              <p>Loading group-stage tables...</p>
            ) : null}

            {groupStageState.status === "error" ? (
              <p>{groupStageState.error}</p>
            ) : null}

            {groupStageState.status === "loaded" && !groupStageState.groups.length ? (
              <p>Group-stage tables will appear here once the groups are published.</p>
            ) : null}

            {groupStageState.groups.length ? (
              <div className="event-group-stage-grid">
                {groupStageState.groups.map((group) => (
                  <section className="event-group-card" key={group.id} aria-labelledby={`group-${group.id}`}>
                    <div className="event-group-card-header">
                      <div>
                        <h3 id={`group-${group.id}`}>{group.name}</h3>
                        {Number.isFinite(group.qualifierCount) && group.qualifierCount > 0 ? (
                          <p>
                            Top {group.qualifierCount} advance
                            {group.qualifierCount === 1 ? "s" : ""}
                          </p>
                        ) : null}
                        {!group.hasStats ? <p>Participants assigned. Standings update after results are recorded.</p> : null}
                      </div>
                    </div>

                    <div className="event-group-table-wrap" tabIndex="0">
                      <table className="event-group-table">
                        <caption>{group.name} group table</caption>
                        <thead>
                          <tr>
                            <th scope="col">#</th>
                            <th scope="col">Participant</th>
                            <th scope="col">P</th>
                            <th scope="col">W</th>
                            <th scope="col">D</th>
                            <th scope="col">L</th>
                            <th scope="col">GF</th>
                            <th scope="col">GA</th>
                            <th scope="col">GD</th>
                            <th scope="col">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row) => (
                            <tr key={row.id} className={row.qualified ? "is-qualified" : ""}>
                              <td>{row.position}</td>
                              <th scope="row">
                                <span>{row.name}</span>
                              </th>
                              <td>{formatGroupStat(row.played)}</td>
                              <td>{formatGroupStat(row.wins)}</td>
                              <td>{formatGroupStat(row.draws)}</td>
                              <td>{formatGroupStat(row.losses)}</td>
                              <td>{formatGroupStat(row.goalsFor)}</td>
                              <td>{formatGroupStat(row.goalsAgainst)}</td>
                              <td>{formatGroupStat(row.goalDifference)}</td>
                              <td>{formatGroupStat(row.points)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
