import { Nav } from "./lib/Nav/client";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-6xl">Bluemoji</h1>
      <h2>
        a silly free-time project by{" "}
        <a href="https://bsky.app/profile/aendra.com">@aendra.com</a>
      </h2>
    </main>
  );
}
