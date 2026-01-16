export default function Support() {
  return (
    <section className="support-hero">
      <div>
        <p className="eyebrow">Need a hand?</p>
        <h1>Support</h1>
        <p>Welcome to our support page. We're here to help with any questions or issues you might have.</p>
      </div>
      <div className="support-card">
        <h2>Contact Us</h2>
        <div className="support-grid">
          <div className="support-item">
            <p className="label">Email</p>
            <p>
              <a href="mailto:support@boxtobox.me">support@boxtobox.me</a>
            </p>
          </div>
          <div className="support-item">
            <p className="label">Phone</p>
            <p>+234 (0) 905 898 5732</p>
          </div>
          <div className="support-item">
            <p className="label">Support Hours</p>
            <p>Monday - Friday, 9am - 6pm (WAT)</p>
          </div>
        </div>
      </div>
    </section>
  );
}
