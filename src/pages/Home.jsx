import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const SLIDES = [
  {
    src: "/images/ios_screenshots/IPhone%20SC.png",
    alt: "BoxtoBox home screen",
  },
  {
    src: "/images/ios_screenshots/IPhone%20SC-1.png",
    alt: "BoxtoBox match detail",
  },
  {
    src: "/images/ios_screenshots/IPhone%20SC-2.png",
    alt: "BoxtoBox player stats",
  },
  {
    src: "/images/ios_screenshots/IPhone%20SC-3.png",
    alt: "BoxtoBox fixtures list",
  },
  {
    src: "/images/ios_screenshots/IPhone%20SC-4.png",
    alt: "BoxtoBox lineup builder",
  },
  {
    src: "/images/ios_screenshots/IPhone%20SC-5.png",
    alt: "BoxtoBox tournament view",
  },
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
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="badge">Built for the beautiful game</span>
            <h1>Organize matches. Track your stats. Grow your team.</h1>
            <p>
              BoxtoBox is the ultimate football companion app for players, coaches, and fans.
              Plan fixtures, collect performance data, and share your journey with the community.
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
              <img src="/images/app_icon.svg" alt="BoxtoBox app icon" className="app-icon" />
              <span>Out now on iOS!</span>
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
            <h3>Match scheduling</h3>
            <p>Set up events and fixtures, then keep everyone informed with quick updates.</p>
          </div>
          <div className="feature-card">
            <div className="icon-circle">P</div>
            <h3>Performance insights</h3>
            <p>Track goals, assists, and key metrics so players and coaches can measure progress.</p>
          </div>
          <div className="feature-card">
            <div className="icon-circle">S</div>
            <h3>Share with friends</h3>
            <p>Post results, share highlights, and bring your community into every matchday.</p>
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
            <p>Be the first to know when BoxtoBox is live on iOS and Android.</p>
          </div>
          <div className="store-badges">
            <NavLink to="/coming-soon">
              <img
                src="/images/GetItOnGooglePlay_Badge_Web_color_English.png"
                alt="Get it on Google Play"
              />
            </NavLink>

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
