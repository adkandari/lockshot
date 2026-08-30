"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <iframe
        src="/landing-pages/complete-shelf-v2.html"
        style={{
          width: "100%",
          height: "100vh",
          border: "none",
          display: "block",
          margin: 0,
          padding: 0,
        }}
        title="Complete Shelf Landing Page"
      />
      <div className="fixed top-4 left-4 z-[9999] pointer-events-auto">
        <Link
          href="/"
          className="px-4 py-2 bg-white/90 hover:bg-white text-gray-900 rounded-lg font-medium transition-colors shadow-lg backdrop-blur-sm border border-gray-200"
        >
          ← Open Desk
        </Link>
      </div>
    </>
  );
}
