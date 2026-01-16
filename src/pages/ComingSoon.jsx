import { NavLink } from "react-router-dom";

export default function ComingSoon() {
  return (
    <div className="coming-soon-container">
      <h1>Coming Soon</h1>
      <p>
        This page or feature is under development.
        <br />
        Please check back again later.
      </p>
      <NavLink to="/">Return to Home</NavLink>
    </div>
  );
}
