import { NavLink } from "react-router-dom";
import { PageHero, SectionHeader, StatGrid } from "../components/SitePrimitives.jsx";

const HOST_INFO_PDF = "/info_boxtobox.pdf";

export default function HostInfo() {
  return (
    <>
      <PageHero
        eyebrow="Host"
        title="Run sessions and events on BoxtoBox"
        actions={(
          <>
            <a className="btn btn-primary" href={HOST_INFO_PDF} download>
              Download host info
            </a>
            <NavLink className="btn btn-secondary" to="/host-verification">
              Start verification
            </NavLink>
          </>
        )}
      >
        <p>
          Learn what hosts need to prepare, how verification starts, and how BoxtoBox support helps set up events and sessions.
        </p>
      </PageHero>

      <section className="site-row-section">
        <SectionHeader eyebrow="Overview" title="Host information">
          <p>Use the host guide if you need more detail before contacting support or starting verification.</p>
        </SectionHeader>

        <StatGrid
          stats={[
            { label: "Guide", value: "PDF", detail: "Downloadable host information" },
            { label: "Verification", value: "Support led", detail: "Contact BoxtoBox to begin" },
            { label: "Tools", value: "Coming soon", detail: "Dashboard access will expand over time" },
          ]}
        />

        <div className="site-row-list host-info-list">
          <article className="site-info-row">
            <h3>Read the host guide</h3>
            <p>The PDF covers extra information for people interested in hosting on BoxtoBox.</p>
          </article>
          <article className="site-info-row">
            <h3>Contact support</h3>
            <p>Send your name, email, phone number, city, and the sessions or events you want to host.</p>
          </article>
          <article className="site-info-row">
            <h3>Complete verification</h3>
            <p>BoxtoBox support will review your details and share the next steps for becoming a verified host.</p>
          </article>
        </div>
      </section>

      <section className="site-cta-band host-info-download">
        <div>
          <p className="site-kicker">More information</p>
          <h2>Download the host PDF</h2>
          <p>Keep the guide for a quick reference while you prepare your host details.</p>
        </div>
        <a className="btn btn-primary" href={HOST_INFO_PDF} download>
          Download PDF
        </a>
      </section>
    </>
  );
}
