import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Testimonials",
};

export default function TestimonialsPage() {
  return (
    <div className="page-stack">
      <h1>Testimonials</h1>
      <p className="muted">Customer stories will be published here.</p>
    </div>
  );
}
