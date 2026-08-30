import LockhotDesk from "@/components/LockhotDesk";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex justify-end mb-4">
          <Link
            href="/landing"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            View Landing Page →
          </Link>
        </div>
      </div>
      <LockhotDesk />
    </main>
  );
}
