"use client";

const PUBLIC_ERROR_MESSAGE = "An unexpected error occurred.";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-stack">
      <h1>Something went wrong</h1>
      <p className="muted">{PUBLIC_ERROR_MESSAGE}</p>
      <div className="error-actions">
        <button type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </div>
  );
}
