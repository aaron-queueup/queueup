"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function SeedPage() {
  const seed = useMutation(api.seed.run);
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSeed = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await seed();
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    }
    setRunning(false);
  };

  return (
    <div className="max-w-md mx-auto text-center mt-12">
      <h1 className="text-2xl font-bold mb-4">Seed Test Data</h1>
      <p className="text-gray-400 mb-6 text-sm">
        This will create 24 fake users, 8 teams, 2 orgs, and 3 tournaments
        (open, in progress, completed) with applications and brackets.
      </p>
      <button
        onClick={handleSeed}
        disabled={running || !!result}
        className="px-6 py-3 rounded-lg bg-[#5865F2] text-white font-semibold hover:bg-[#4752C4] transition-colors disabled:opacity-60"
      >
        {running ? "Seeding..." : result ? "Done!" : "Seed Data"}
      </button>
      {result && (
        <pre className="mt-6 bg-[#1a1a3e] rounded-lg p-4 text-left text-sm text-green-400">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
}
