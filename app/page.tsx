import LockhotDesk from "@/components/LockhotDesk";
import LockhotBookshelfHero from "@/components/LockhotBookshelfHero";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <LockhotBookshelfHero />
      <div id="lockshot-desk">
        <LockhotDesk />
      </div>
    </main>
  );
}
