import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  getAuthUser,
  observeAuthState,
  registerWithEmail,
  signInWithEmail,
  signOut,
} from "../lib/auth.js";

export default function Header() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
    email: "",
    password: "",
  });
  const profileRef = useRef(null);

  useEffect(() => {
    let unsubscribe = null;
    try {
      setIsSignedIn(Boolean(getAuthUser()));
      unsubscribe = observeAuthState((user) => {
        setIsSignedIn(Boolean(user));
      });
    } catch (error) {
      setIsSignedIn(false);
    }
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    setAuthError("");
    if (authOpen) {
      setFormValues((prev) => ({ ...prev, password: "" }));
    }
  }, [authMode, authOpen]);

  useEffect(() => {
    const handleClick = (event) => {
      if (!profileRef.current) {
        return;
      }
      if (!profileRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useEffect(() => {
    const handleAuthOpen = (event) => {
      const requestedMode = event?.detail?.mode === "register" ? "register" : "signin";
      setAuthMode(requestedMode);
      setAuthOpen(true);
      setMenuOpen(false);
    };
    window.addEventListener("auth:open", handleAuthOpen);
    return () => {
      window.removeEventListener("auth:open", handleAuthOpen);
    };
  }, []);

  const handleAuthFieldChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const authTitle = useMemo(() => {
    return authMode === "register" ? "Create your account" : "Welcome back";
  }, [authMode]);

  const authButtonLabel = authMode === "register" ? "Create account" : "Sign in";

  const submitAuth = async (event) => {
    event.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (authMode === "register") {
        await registerWithEmail({
          name: formValues.name.trim(),
          email: formValues.email.trim(),
          password: formValues.password,
        });
      } else {
        await signInWithEmail({
          email: formValues.email.trim(),
          password: formValues.password,
        });
      }
      setAuthOpen(false);
      setAuthLoading(false);
    } catch (error) {
      setAuthLoading(false);
      setAuthError(error?.message || "Unable to sign in right now.");
    }
  };

  return (
    <header className="top-nav">
      <NavLink to="/" className="logo-link" aria-label="BoxtoBox home">
        <img src="/images/bb_logo.svg" alt="BoxtoBox logo" />
      </NavLink>

      <input
        type="checkbox"
        id="menu-toggle"
        className="menu-toggle"
        aria-label="Toggle navigation"
      />
      <label htmlFor="menu-toggle" className="burger" aria-label="Open menu">
        <span></span>
        <span></span>
        <span></span>
      </label>

      <div className="nav-actions">
        <nav className="nav-links">
          <NavLink to="/" className="hover-highlight">
            HOME
          </NavLink>
          <NavLink to="/events" className="hover-highlight">
            EVENTS
          </NavLink>
          <NavLink to="/support" className="hover-highlight">
            SUPPORT
          </NavLink>
          <NavLink to="/coming-soon" className="hover-highlight">
            NEWS
          </NavLink>
        </nav>

        <div className={`nav-profile${menuOpen ? " open" : ""}`} ref={profileRef}>
          <button
            className="profile-toggle"
            type="button"
            aria-haspopup="true"
            aria-expanded={menuOpen ? "true" : "false"}
            aria-label="Account menu"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setMenuOpen((open) => !open);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M12 12.8c2.6 0 4.7-2.1 4.7-4.7S14.6 3.4 12 3.4 7.3 5.5 7.3 8.1 9.4 12.8 12 12.8zm0 1.8c-3.4 0-8.6 1.7-8.6 5.2V21h17.2v-1.2c0-3.5-5.2-5.2-8.6-5.2z"
                fill="currentColor"
              />
            </svg>
          </button>
          <div className="profile-menu" role="menu">
            {!isSignedIn && (
              <>
                <button
                  className="profile-item profile-action"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setAuthMode("signin");
                    setAuthOpen(true);
                  }}
                >
                  Sign In
                </button>
                <button
                  className="profile-item profile-action"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setAuthMode("register");
                    setAuthOpen(true);
                  }}
                >
                  Register
                </button>
              </>
            )}
            {isSignedIn && (
              <>
                <NavLink to="/events" className="profile-item" role="menuitem">
                  Events
                </NavLink>
                <button
                  className="profile-item profile-action"
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    setMenuOpen(false);
                    try {
                      await signOut();
                    } catch (error) {
                      setAuthError(error?.message || "Unable to sign out.");
                    }
                  }}
                >
                  Sign Out
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {authOpen && (
        <div
          className="auth-overlay"
          role="dialog"
          aria-modal="true"
          aria-label={authTitle}
          onClick={(event) => {
            if (event.target.classList.contains("auth-overlay")) {
              setAuthOpen(false);
            }
          }}
        >
          <div className="auth-card">
            <div className="auth-header">
              <div>
                <p className="auth-eyebrow">Account</p>
                <h2>{authTitle}</h2>
              </div>
              <button
                className="auth-close"
                type="button"
                aria-label="Close"
                onClick={() => setAuthOpen(false)}
              >
                x
              </button>
            </div>

            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab${authMode === "signin" ? " active" : ""}`}
                onClick={() => setAuthMode("signin")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab${authMode === "register" ? " active" : ""}`}
                onClick={() => setAuthMode("register")}
              >
                Register
              </button>
            </div>

            {authError && <div className="auth-error">{authError}</div>}

            <form className="auth-form" onSubmit={submitAuth}>
              {authMode === "register" && (
                <label className="auth-field">
                  Full name
                  <input
                    name="name"
                    type="text"
                    placeholder="Your name"
                    value={formValues.name}
                    onChange={handleAuthFieldChange}
                    required
                  />
                </label>
              )}
              <label className="auth-field">
                Email
                <input
                  name="email"
                  type="email"
                  placeholder="you@email.com"
                  value={formValues.email}
                  onChange={handleAuthFieldChange}
                  required
                />
              </label>
              <label className="auth-field">
                Password
                <input
                  name="password"
                  type="password"
                  placeholder="password"
                  value={formValues.password}
                  onChange={handleAuthFieldChange}
                  required
                  minLength={6}
                />
              </label>
              <button className="auth-submit" type="submit" disabled={authLoading}>
                {authLoading ? "Please wait..." : authButtonLabel}
              </button>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
