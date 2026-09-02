"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <h1>Something went wrong</h1>
      <p className="muted">{error.message || "An unexpected error occurred."}</p>
      <div className="error-actions">
        <button type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
