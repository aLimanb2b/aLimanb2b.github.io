import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useParams, useSearchParams } from "react-router-dom";

const QR_SCRIPT_URL = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

function formatExpiry(value) {
  if (!value) {
    return "Valid for a limited time.";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Valid for a limited time.";
  }

  return `Expires ${date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })}`;
}

function ensureQrCodeScript() {
  if (window.QRCode) {
    return Promise.resolve(window.QRCode);
  }

  if (window.__boxtoboxQrCodePromise) {
    return window.__boxtoboxQrCodePromise;
  }

  window.__boxtoboxQrCodePromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-boxtobox-qrcode="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.QRCode), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load QR generator.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = QR_SCRIPT_URL;
    script.async = true;
    script.dataset.boxtoboxQrcode = "true";
    script.onload = () => {
      if (window.QRCode) {
        resolve(window.QRCode);
      } else {
        reject(new Error("QR generator loaded without exposing QRCode."));
      }
    };
    script.onerror = () => reject(new Error("Unable to load QR generator."));
    document.head.appendChild(script);
  });

  return window.__boxtoboxQrCodePromise;
}

export default function CheckInPass() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const qrRef = useRef(null);
  const [qrError, setQrError] = useState("");

  const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);
  const expiresAt = useMemo(() => (searchParams.get("expiresAt") || "").trim(), [searchParams]);
  const title = useMemo(() => {
    const queryTitle = (searchParams.get("title") || "").trim();
    return queryTitle || "Event Check-in";
  }, [searchParams]);

  useEffect(() => {
    document.title = `${title} | Check-in`;
    return () => {
      document.title = "BoxtoBox";
    };
  }, [title]);

  useEffect(() => {
    const node = qrRef.current;
    if (!node) {
      return undefined;
    }

    node.innerHTML = "";
    setQrError("");

    if (!token) {
      setQrError("Missing check-in token.");
      return undefined;
    }

    let cancelled = false;

    ensureQrCodeScript()
      .then((QRCode) => {
        if (cancelled || !qrRef.current) {
          return;
        }

        qrRef.current.innerHTML = "";
        new QRCode(qrRef.current, {
          text: token,
          width: 280,
          height: 280,
          colorDark: "#0b0b0f",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setQrError("QR generation is unavailable right now. Use the code below instead.");
        }
      });

    return () => {
      cancelled = true;
      if (node) {
        node.innerHTML = "";
      }
    };
  }, [token]);

  return (
    <section className="checkin-pass-section">
      <div className="checkin-pass-shell">
        <div className="checkin-pass-intro">
          <p className="eyebrow">Check-in pass</p>
          <h1>{title}</h1>
          <p>
            Present this QR code to the event host to check in quickly. If scanning is unavailable,
            the host can use the token shown below.
          </p>
        </div>

        <div className="checkin-pass-card card">
          <div className="checkin-pass-qr-panel">
            <div className="checkin-pass-qr-frame">
              {qrError ? (
                <div className="checkin-pass-qr-fallback">
                  <strong>QR unavailable</strong>
                  <span>{qrError}</span>
                </div>
              ) : (
                <div ref={qrRef} className="checkin-pass-qr-canvas" aria-label="Check-in QR code" />
              )}
            </div>
            <p className="checkin-pass-expiry">{formatExpiry(expiresAt)}</p>
          </div>

          <div className="checkin-pass-meta">
            <div className="checkin-pass-token-card">
              <span className="checkin-pass-label">Check-in code</span>
              <code className="checkin-pass-token">{token || "Unavailable"}</code>
            </div>

            <div className="checkin-pass-note">
              <h3>How it works</h3>
              <p>The host scans this QR code or enters the token manually to complete your check-in.</p>
            </div>

            <div className="checkin-pass-actions">
              {id ? (
                <NavLink className="btn-secondary" to={`/event/${id}`}>
                  Back to event
                </NavLink>
              ) : null}
              <NavLink className="btn-primary" to="/support">
                Need help?
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
