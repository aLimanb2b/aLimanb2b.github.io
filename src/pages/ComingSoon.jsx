import { StatusPage } from "../components/SitePrimitives.jsx";

export default function ComingSoon() {
  return (
    <StatusPage
      eyebrow="Not available yet"
      title="Coming soon"
      message="This area is not live yet. Use the current events, sessions, support, or host dashboard pages for now."
      actionLabel="Return home"
      to="/"
    />
  );
}
