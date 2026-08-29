import LockhotDesk from "@/components/LockhotDesk";
import LockhotHero from "@/components/LockhotHero";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <LockhotHero />
      <div id="lockshot-desk">
        <LockhotDesk />
      </div>
    </main>
  );
}
