import { NavLink } from "react-router-dom";

export default function Header() {
  return (
    <header className="top-nav">
      <NavLink to="/" className="logo-link" aria-label="BoxtoBox home">
        <img src="/images/bb_logo.svg" alt="BoxtoBox logo" />
      </NavLink>

      <input
        type="checkbox"
        id="menu-toggle"
        className="menu-toggle"
        aria-label="Toggle navigation"
      />
      <label htmlFor="menu-toggle" className="burger" aria-label="Open menu">
        <span></span>
        <span></span>
        <span></span>
      </label>

      <nav className="nav-links">
        <NavLink to="/" className="hover-highlight">
          HOME
        </NavLink>
        <NavLink to="/events" className="hover-highlight">
          EVENTS
        </NavLink>
        <NavLink to="/support" className="hover-highlight">
          SUPPORT
        </NavLink>
        <NavLink to="/coming-soon" className="hover-highlight">
          NEWS
        </NavLink>
      </nav>
    </header>
  );
}
