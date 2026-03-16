"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { Plus, Ticket, Users, Trophy } from "lucide-react";
import { ShimmerList, ShimmerCard } from "@/app/Shimmer";
import { useJoinModal } from "@/app/JoinModal";

type Tab = "tournaments" | "organizations";

export default function DashboardPage() {
  const { openJoinModal } = useJoinModal();
  const [tab, setTab] = useState<Tab>("tournaments");
  const tournaments = useQuery(api.tournaments.myTournaments, {});
  const myOrgs = useQuery(api.organizations.myOrgs, {});

  const statusColors: Record<string, string> = {
    open: "text-green-400 bg-green-400/10",
    in_progress: "text-yellow-400 bg-yellow-400/10",
    completed: "text-gray-400 bg-gray-400/10",
  };

  const appColors: Record<string, string> = {
    approved: "text-green-400 bg-green-400/10",
    pending: "text-yellow-400 bg-yellow-400/10",
    denied: "text-red-400 bg-red-400/10",
    blocked: "text-red-400 bg-red-400/10",
  };

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-[#1a1a3e] rounded-lg p-1 gap-1">
          <button
            onClick={() => setTab("tournaments")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "tournaments"
                ? "bg-[#5865F2] text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Trophy size={14} />
            Tournaments
            {tournaments && tournaments.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === "tournaments" ? "bg-white/20" : "bg-[#5865F2]/20 text-[#5865F2]"
              }`}>
                {tournaments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("organizations")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "organizations"
                ? "bg-[#5865F2] text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users size={14} />
            Organizations
            {myOrgs && myOrgs.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                tab === "organizations" ? "bg-white/20" : "bg-[#5865F2]/20 text-[#5865F2]"
              }`}>
                {myOrgs.length}
              </span>
            )}
          </button>
        </div>

        {/* Actions */}
        {tab === "tournaments" ? (
          <button
            onClick={openJoinModal}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#5865F2]/30 text-[#5865F2] hover:bg-[#5865F2]/10 transition-colors text-sm font-medium"
          >
            <Ticket size={14} />
            Join
          </button>
        ) : (
          <Link
            href="/create-org"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors text-sm font-medium"
          >
            <Plus size={14} />
            Create Org
          </Link>
        )}
      </div>

      {/* Tournaments tab */}
      {tab === "tournaments" && (
        <>
          {tournaments === undefined ? (
            <ShimmerList count={3} />
          ) : tournaments.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#5865F2]/10 flex items-center justify-center mx-auto mb-4">
                <Trophy size={28} className="text-[#5865F2]" />
              </div>
              <p className="text-gray-400 mb-4">
                No tournaments yet. Join one with an invite code!
              </p>
              <button
                onClick={openJoinModal}
                className="inline-block px-5 py-2.5 rounded-lg bg-[#5865F2] text-white font-semibold text-sm hover:bg-[#4752C4] transition-colors"
              >
                Join with Code
              </button>
            </div>
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
                    <span
                      className={`text-xs font-semibold uppercase px-2 py-1 rounded ${statusColors[item.status]}`}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">{item.orgName}</p>
                  <div className="flex items-center gap-3 mt-2 text-sm">
                    <span className="text-gray-400">
                      {item.teamCount}/{item.capacity} teams
                    </span>
                    <span className="text-gray-400">
                      {item.teamSize}v{item.teamSize}
                    </span>
                    {item.applicationStatus && (
                      <span
                        className={`text-xs font-semibold capitalize px-2 py-0.5 rounded ${appColors[item.applicationStatus]}`}
                      >
                        {item.applicationStatus}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Organizations tab */}
      {tab === "organizations" && (
        <>
          {myOrgs === undefined ? (
            <ShimmerList count={2} />
          ) : myOrgs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-[#5865F2]/10 flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-[#5865F2]" />
              </div>
              <p className="text-gray-400 mb-4">
                No organizations yet. Create one to start hosting tournaments.
              </p>
              <Link
                href="/create-org"
                className="inline-block px-5 py-2.5 rounded-lg bg-[#5865F2] text-white font-semibold text-sm hover:bg-[#4752C4] transition-colors"
              >
                Create Organization
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {myOrgs.map((org) => (
                <div
                  key={org._id}
                  className="bg-[#1a1a3e] rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-[#5865F2]/15 flex items-center justify-center shrink-0">
                      <span className="text-[#5865F2] font-bold text-lg">
                        {org.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{org.name}</p>
                      <p className="text-gray-400 text-sm capitalize">
                        {org.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                    <span>
                      {org.memberCount} member{org.memberCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
