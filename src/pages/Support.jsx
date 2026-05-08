import { PageHero } from "../components/SitePrimitives.jsx";

export default function Support() {
  return (
    <>
      <PageHero eyebrow="Support" title="Get help from BoxtoBox">
        <p>Contact us for account issues, event support, host verification, payment questions, or product feedback.</p>
      </PageHero>

      <section className="support-hero">
      <div className="support-card">
        <h2>Contact</h2>
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
    </>
  );
}
