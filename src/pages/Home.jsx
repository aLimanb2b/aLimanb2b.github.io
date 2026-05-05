import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const SLIDES = [
  {
    src: "/images/ios_screenshots/IPhone%20SC.png",
    alt: "BoxtoBox home screen",
  },
  {
    src: "/images/ios_screenshots/IPhone%20SC-1.png",
    alt: "BoxtoBox event detail",
  },
  {
    src: "/images/ios_screenshots/IPhone%20SC-2.png",
    alt: "BoxtoBox player stats",
  }

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

  const handleDownloadClick = (event) => {
    event.preventDefault();
    const target = document.getElementById("download");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <div className="sessions-cta-bar">
        <div className="events-cta-text">
          <span>Go to Sessions</span>
          <p>Discover recurring sessions, open training blocks, and host-led meetups.</p>
        </div>
        <NavLink className="btn btn-primary" to="/sessions">
          Browse sessions
        </NavLink>
      </div>

      {/* <div className="events-cta-bar">
        <div className="events-cta-text">
          <span>Go to Events</span>
          <p>See upcoming events, tournaments, and community games.</p>
        </div>
        <NavLink className="btn btn-primary" to="/events">
          Browse events
        </NavLink>
      </div> */}

      <section className="host-event">
        <div className="host-event-card">
          <div className="host-event-copy">
            <p className="eyebrow">Host an Event</p>
            <h2>Want to host with BoxtoBox?</h2>
            <p>
              If you are interested in hosting and want to learn more, contact us.
              We offer a variety of host tools that make event organization and
              monitoring easier than ever.
            </p>
          </div>
          <NavLink className="btn btn-primary" to="/support">
            Contact us
          </NavLink>
        </div>
      </section>

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="badge">Built for every sport</span>
            <h1>Host sports events. Participate. Hassle free.</h1>
            <p>
              BoxtoBox is a sports events app that connects hosts and participants making it easy to organise, find and participate in different sports.
              Plan events, collect performance data, and share your journey with the community.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#download" onClick={handleDownloadClick}>
                Get the app
              </a>
              <NavLink className="btn btn-secondary" to="/events">
                Browse events
              </NavLink>
            </div>
            <div className="hero-meta">
              <img src="/images/logo_transparent.png" alt="BoxtoBox app icon" className="app-icon" />
              <span>Out now on iOS & Android!</span>
            </div>
          </div>

          <div className="hero-visual">
            <div
              className="phone-card"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              <div className="phone-image">
                <div className="screenshot-slider">
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
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="section-header">
          <p className="eyebrow">Why BoxtoBox</p>
          <h2>Everything your squad needs to stay organized.</h2>
          <p>From quick scheduling to performance insights, BoxtoBox keeps teams focused and connected.</p>
        </div>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="icon-circle">M</div>
            <h3>Event scheduling</h3>
            <p>Set up practices, games, and tournaments, then keep everyone informed with quick updates.</p>
          </div>
          <div className="feature-card">
            <div className="icon-circle">P</div>
            <h3>Performance insights</h3>
            <p>Track scores, assists, and key metrics so players and coaches can measure progress.</p>
          </div>
          <div className="feature-card">
            <div className="icon-circle">S</div>
            <h3>Share with friends</h3>
            <p>Post results, share highlights, and bring your community into every game day.</p>
          </div>
          <div className="feature-card">
            <div className="icon-circle">C</div>
            <h3>Compete</h3>
            <p>Challenge rival squads and climb the rankings across your region.</p>
          </div>
        </div>
      </section>

      <section id="download">
        <div className="download-card">
          <div>
            <p className="eyebrow">Get the app</p>
            <h2>Download the app</h2>
            <p>Available now on iOS and Android.</p>
          </div>
          <div className="store-badges">
            <a href="https://play.google.com/store/apps/details?id=me.boxtobox.boxtobox&pli=1">
              <img
                src="/images/GetItOnGooglePlay_Badge_Web_color_English.png"
                alt="Get it on Google Play"
              />
            </a>

            <a href="https://apps.apple.com/gb/app/boxtobox/id6756844810">
              <img
                src="/images/Download_on_the_App_Store_Badge_US-UK_RGB_wht_092917.svg"
                alt="Download on the App Store"
              />
            </a>
          </div>
        </div>
      </section>

    </>
  );
}
