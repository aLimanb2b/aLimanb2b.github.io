import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { SectionHeader, StatGrid } from "../components/SitePrimitives.jsx";

const SLIDES = [
  { src: "/images/ios_screenshots/IPhone%20SC.png", alt: "BoxtoBox home screen" },
  { src: "/images/ios_screenshots/IPhone%20SC-1.png", alt: "BoxtoBox event detail" },
  { src: "/images/ios_screenshots/IPhone%20SC-2.png", alt: "BoxtoBox player stats" },
];

const PRODUCT_ROWS = [
  ["Discover", "Find football, esports, training, and community sessions around you."],
  ["Join", "Register, pay where required, and keep your spot details in one place."],
  ["Host", "Create sessions and events, monitor attendance, and track host data."],
  ["Track", "Use results, stats, and leaderboards to follow player performance."],
];

export default function Home() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SLIDES.length);
    }, 3500);
    return () => window.clearInterval(interval);
  }, [paused]);

  return (
    <>
      <section className="home-hero">
        <div className="home-hero-grid">
          <div className="home-hero-copy">
            <p className="site-kicker">BoxtoBox</p>
            <h1>Find games. Join sessions. Host with control.</h1>
            <p>
              BoxtoBox connects players and hosts through structured sports events, recurring sessions,
              payments, check-in, and performance data.
            </p>
            <div className="site-actions">
              <a className="btn btn-primary" href="#download">Get the app</a>
              <NavLink className="btn btn-secondary" to="/sessions">Browse sessions</NavLink>
            </div>
          </div>

          <div
            className="home-phone-panel"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <div className="screenshot-stage">
              {SLIDES.map((slide, index) => (
                <img
                  key={slide.src}
                  src={slide.src}
                  alt={slide.alt}
                  className={`screenshot${index === activeIndex ? " active" : ""}`}
                />
              ))}
            </div>
            <div className="slider-dots">
              {SLIDES.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  className={`slider-dot${index === activeIndex ? " active" : ""}`}
                  type="button"
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="home-hero-stats">
          <StatGrid
            stats={[
              { label: "Browse", value: "Events", detail: "Tournaments and community fixtures" },
              { label: "Book", value: "Sessions", detail: "Recurring host-led games" },
              { label: "Manage", value: "Hosts", detail: "Dashboard-ready operations" },
            ]}
          />
        </div>
      </section>

      <section className="site-row-section">
        <SectionHeader eyebrow="What you can do" title="One product for players and hosts" />
        <div className="site-row-list">
          {PRODUCT_ROWS.map(([title, body]) => (
            <article className="site-info-row" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="site-cta-band">
        <div>
          <p className="site-kicker">Host operations</p>
          <h2>Hosting events should feel organized.</h2>
          <p>Learn how BoxtoBox supports hosts, what to prepare, and how to start the verification process.</p>
        </div>
        <div className="site-actions">
          <NavLink className="btn btn-primary" to="/host">Host information</NavLink>
          <NavLink className="btn btn-secondary" to="/support">Contact support</NavLink>
        </div>
      </section>

      <section id="download" className="site-download-band">
        <div>
          <p className="site-kicker">Download</p>
          <h2>Get BoxtoBox on your phone</h2>
          <p>Available now on iOS and Android.</p>
        </div>
        <div className="store-badges">
          <a href="https://play.google.com/store/apps/details?id=me.boxtobox.boxtobox&pli=1">
            <img src="/images/GetItOnGooglePlay_Badge_Web_color_English.png" alt="Get it on Google Play" />
          </a>
          <a href="https://apps.apple.com/gb/app/boxtobox/id6756844810">
            <img src="/images/Download_on_the_App_Store_Badge_US-UK_RGB_wht_092917.svg" alt="Download on the App Store" />
          </a>
        </div>
      </section>
    </>
  );
}
