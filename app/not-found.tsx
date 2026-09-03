import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-stack">
      <h1>Page not found</h1>
      <p className="muted">The page you requested does not exist.</p>
      <div className="error-actions">
        <Link href="/">Return home</Link>
      </div>
    </div>
  );
}
