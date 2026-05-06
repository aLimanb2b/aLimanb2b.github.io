import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { apiRequest } from "../lib/api.js";

const MAX_NIN_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_NIN_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const STEPS = ["Details", "Contact", "Documents", "Review"];

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  bankAccountNumber: "",
  ninFile: null,
};

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const commaIndex = result.indexOf(",");
      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1));
    };
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
}

function validateStep(step, form) {
  if (step === 0) {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      return "Enter your first name, last name, and email.";
    }
    if (!isValidEmail(form.email.trim())) {
      return "Enter a valid email address.";
    }
  }
  if (step === 1 && !form.phoneNumber.trim()) {
    return "Enter your phone number.";
  }
  if (step === 2) {
    if (!form.ninFile) {
      return "Upload your NIN document.";
    }
    if (!ALLOWED_NIN_FILE_TYPES.includes(form.ninFile.type)) {
      return "Upload a PDF, JPG, or PNG file.";
    }
    if (form.ninFile.size > MAX_NIN_FILE_SIZE) {
      return "NIN document must be 5 MB or smaller.";
    }
    if (!form.bankAccountNumber.trim()) {
      return "Enter the bank account number for payments.";
    }
  }
  return "";
}

export default function HostVerification() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") || "").trim(), [searchParams]);
  const [tokenStatus, setTokenStatus] = useState("checking");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isActive = true;

    async function validateToken() {
      if (!token) {
        setTokenStatus("invalid");
        return;
      }
      setTokenStatus("checking");
      try {
        const result = await apiRequest(`/v1/host-verification/${encodeURIComponent(token)}`, {
          authRequired: false,
        });
        if (!isActive) {
          return;
        }
        setTokenStatus(result?.valid ? "valid" : "invalid");
      } catch (err) {
        if (!isActive) {
          return;
        }
        setTokenStatus("invalid");
      }
    }

    validateToken();
    return () => {
      isActive = false;
    };
  }, [token]);

  const updateField = (field) => (event) => {
    setError("");
    setForm((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateFile = (event) => {
    setError("");
    const file = event.target.files?.[0] || null;
    setForm((current) => ({
      ...current,
      ninFile: file,
    }));
  };

  const goNext = () => {
    const validationError = validateStep(step, form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((current) => Math.min(STEPS.length - 1, current + 1));
  };

  const goBack = () => {
    setError("");
    setStep((current) => Math.max(0, current - 1));
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const validationError = validateStep(2, form);
    if (validationError) {
      setStep(2);
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const base64 = await readFileAsBase64(form.ninFile);
      await apiRequest(`/v1/host-verification/${encodeURIComponent(token)}/submit`, {
        method: "POST",
        authRequired: false,
        body: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
          phone_number: form.phoneNumber.trim(),
          bank_account_number: form.bankAccountNumber.trim(),
          nin_file: {
            file_name: form.ninFile.name,
            mime_type: form.ninFile.type,
            content: base64,
          },
        },
      });
      setSubmitted(true);
    } catch (err) {
      setError(err?.message || "Unable to submit host verification right now.");
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenStatus === "checking") {
    return (
      <section className="host-verification-page">
        <div className="host-verification-card">
          <p className="eyebrow">Host verification</p>
          <h1>Checking link</h1>
          <p>We are validating this one-time verification link.</p>
        </div>
      </section>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <section className="host-verification-page">
        <div className="host-verification-card">
          <p className="eyebrow">Host verification</p>
          <h1>Link unavailable</h1>
          <p>This verification link is invalid, expired, or has already been used.</p>
          <a className="btn btn-primary" href="mailto:support@boxtobox.me">
            Contact support
          </a>
        </div>
      </section>
    );
  }

  if (submitted) {
    return (
      <section className="host-verification-page">
        <div className="host-verification-card">
          <p className="eyebrow">Submitted</p>
          <h1>Verification sent for review</h1>
          <p>Your host details have been sent to BoxtoBox support. We will review them and follow up if anything else is needed.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="host-verification-page">
      <form className="host-verification-card" onSubmit={submitForm}>
        <div className="host-verification-header">
          <p className="eyebrow">Host verification</p>
          <h1>Verify host details</h1>
          <p>Complete the steps below so BoxtoBox can review your host profile and payment details.</p>
        </div>

        <div className="verification-steps" aria-label="Verification progress">
          {STEPS.map((label, index) => (
            <div className={`verification-step${index === step ? " active" : ""}${index < step ? " complete" : ""}`} key={label}>
              <span>{index + 1}</span>
              <strong>{label}</strong>
            </div>
          ))}
        </div>

        {error ? <div className="host-verification-error">{error}</div> : null}

        {step === 0 ? (
          <div className="host-verification-fields">
            <label>
              First name
              <input type="text" value={form.firstName} onChange={updateField("firstName")} autoComplete="given-name" />
            </label>
            <label>
              Last name
              <input type="text" value={form.lastName} onChange={updateField("lastName")} autoComplete="family-name" />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={updateField("email")} autoComplete="email" />
            </label>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="host-verification-fields">
            <label>
              Phone number
              <input type="tel" value={form.phoneNumber} onChange={updateField("phoneNumber")} autoComplete="tel" />
            </label>
            <p className="host-verification-note">
              This number is for support purposes in case someone participating in your session or event needs help reaching the host.
            </p>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="host-verification-fields">
            <label>
              NIN document
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={updateFile} />
            </label>
            <label>
              Bank account number
              <input type="text" inputMode="numeric" value={form.bankAccountNumber} onChange={updateField("bankAccountNumber")} />
            </label>
            <p className="host-verification-note">Accepted NIN document formats: PDF, JPG, or PNG. Maximum file size is 5 MB.</p>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="host-verification-review">
            <div>
              <span>Name</span>
              <strong>{form.firstName} {form.lastName}</strong>
            </div>
            <div>
              <span>Email</span>
              <strong>{form.email}</strong>
            </div>
            <div>
              <span>Phone</span>
              <strong>{form.phoneNumber}</strong>
            </div>
            <div>
              <span>Bank account</span>
              <strong>{form.bankAccountNumber}</strong>
            </div>
            <div>
              <span>NIN document</span>
              <strong>{form.ninFile?.name || "Uploaded document"}</strong>
            </div>
            <div className="host-verification-disclaimer">
              <h2>Disclaimer</h2>
              <p>
                Placeholder disclaimer content. By submitting this form, you confirm that the information provided is accurate and that BoxtoBox may review it for host verification and support purposes.
              </p>
            </div>
          </div>
        ) : null}

        <div className="host-verification-actions">
          {step > 0 ? (
            <button className="btn btn-secondary" type="button" onClick={goBack} disabled={submitting}>
              Back
            </button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" type="button" onClick={goNext}>
              Continue
            </button>
          ) : (
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit for review"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
