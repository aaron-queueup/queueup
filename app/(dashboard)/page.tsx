"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Plus, Ticket } from "lucide-react";
import { ShimmerList } from "@/app/Shimmer";
import { useJoinModal } from "@/app/JoinModal";

export default function TournamentsPage() {
  const tournaments = useQuery(api.tournaments.list, {});
  const { openJoinModal } = useJoinModal();

  const statusColors: Record<string, string> = {
    open: "text-green-400 bg-green-400/10",
    in_progress: "text-yellow-400 bg-yellow-400/10",
    completed: "text-gray-400 bg-gray-400/10",
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tournaments</h1>
        <div className="flex gap-3">
          <button
            onClick={openJoinModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#5865F2]/30 text-[#5865F2] hover:bg-[#5865F2]/10 transition-colors text-sm font-medium"
          >
            <Ticket size={16} />
            Join
          </button>
          <Link
            href="/create-tournament"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Create
          </Link>
        </div>
      </div>

      {tournaments === undefined ? (
        <ShimmerList count={4} />
      ) : tournaments.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">No tournaments yet</p>
      ) : (
        <div className="grid gap-3">
          {tournaments.map((item) => (
            <Link
              key={item._id}
              href={`/tournament/${item._id}`}
              className="bg-[#1a1a3e] rounded-xl p-4 hover:bg-[#22224a] transition-colors block"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">{item.name}</h3>
                <div className="flex items-center gap-2">
                  {item.teamCount >= item.capacity && item.status === "open" && (
                    <span className="text-xs font-semibold uppercase px-2 py-1 rounded text-red-400 bg-red-400/10">
                      Full
                    </span>
                  )}
                  <span
                    className={`text-xs font-semibold uppercase px-2 py-1 rounded ${statusColors[item.status]}`}
                  >
                    {item.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-1">{item.orgName}</p>
              <div className="flex items-center gap-4 mt-2 text-gray-400 text-sm">
                <span>
                  {item.teamCount}/{item.capacity} teams
                </span>
                <span>
                  {item.teamSize}v{item.teamSize}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
