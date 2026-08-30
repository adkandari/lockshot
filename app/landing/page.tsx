import LockhotBookshelfHero from "@/components/LockhotBookshelfHero";
import Link from "next/link";

export default function LandingPage() {
  return (
    <>
      <LockhotBookshelfHero />
      <div className="fixed top-4 left-4 z-50">
        <Link
          href="/"
          className="px-4 py-2 bg-[#3a2118]/90 hover:bg-[#3a2118] text-[#f4eee6] rounded-lg font-medium transition-colors shadow-lg backdrop-blur-sm border border-[#c87046]/30"
        >
          ← Open Desk
        </Link>
      </div>
    </>
  );
}
