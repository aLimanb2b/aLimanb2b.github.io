import { NavLink } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="coming-soon-container">
      <h1>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <NavLink to="/">Return to Home</NavLink>
    </div>
  );
}
