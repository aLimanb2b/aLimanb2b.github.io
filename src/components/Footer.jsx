import { NavLink } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="site-footer">

      <div className="site-footer-grid">
        <div>
          <p className="site-footer-label">Product</p>
          <NavLink to="/sessions">Sessions</NavLink>
          <NavLink to="/events">Events</NavLink>
        </div>
        <div>
          <p className="site-footer-label">Host</p>
          <NavLink to="/host">Host information</NavLink>
          <NavLink to="/support">Host support</NavLink>
          <NavLink to="/host-verification">Become verified</NavLink>
        </div>
        <div>
          <p className="site-footer-label">Company</p>
          <NavLink to="/support">Support</NavLink>
          <NavLink to="/privacy">Privacy Policy</NavLink>
          <NavLink to="/terms">Terms &amp; Conditions</NavLink>
        </div>
        <div>
          <p className="site-footer-label">Social</p>
          <NavLink to="/coming-soon">TikTok</NavLink>
          <NavLink to="/coming-soon">X</NavLink>
          <NavLink to="/coming-soon">Instagram</NavLink>
        </div>
      </div>
    </footer>
  );
}
