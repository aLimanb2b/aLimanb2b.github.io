import { StatusPage } from "../components/SitePrimitives.jsx";

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="404"
      title="Page not found"
      message="The page you are looking for does not exist or has moved."
      actionLabel="Return home"
      to="/"
    />
  );
}
