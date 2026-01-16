import { NavLink } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="social-section">
      <div className="social-icons">
        <p className="social-text">Please connect with us on your favourite platforms</p>
        <NavLink to="/coming-soon">
          <img src="/images/TikTok-logo-CMYK-Tag.png" alt="tiktok" />
        </NavLink>
        <NavLink to="/coming-soon">
          <img src="/images/xlogo-black.png" alt="X" />
        </NavLink>
        <NavLink to="/coming-soon">
          <img src="/images/Instagram_logo_2016.png" alt="Instagram" />
        </NavLink>
      </div>

      <div className="legal-links">
        <NavLink to="/privacy" className="hover-highlight">
          Privacy Policy
        </NavLink>
        <span>|</span>
        <NavLink to="/terms" className="hover-highlight">
          Terms &amp; Conditions
        </NavLink>
      </div>
    </footer>
  );
}
