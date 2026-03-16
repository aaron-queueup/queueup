"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Plus, Check, X, ChevronRight } from "lucide-react";
import { useModal } from "@/app/ModalProvider";
import { Shimmer } from "@/app/Shimmer";

export default function TeamsPage() {
  const myTeams = useQuery(api.teams.myTeams, {});
  const invites = useQuery(api.teams.getInvites, {});
  const respondToInvite = useMutation(api.teams.respondToInvite);
  const { alert } = useModal();

  const handleRespond = async (teamMemberId: any, accept: boolean) => {
    try {
      await respondToInvite({ teamMemberId, accept });
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Teams</h1>
        <Link
          href="/create-team"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5865F2] text-white hover:bg-[#4752C4] transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Create Team
        </Link>
      </div>

      {/* Pending Invites */}
      {invites && invites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-3">Pending Invites</h2>
          <div className="grid gap-2">
            {invites.map((invite) => (
              <div
                key={invite._id}
                className="bg-[#1a1a3e] rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">{invite.teamName}</p>
                  <p className="text-gray-400 text-sm">
                    Invited by {invite.leaderName}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(invite._id, true)}
                    className="p-2 rounded-lg bg-green-400/10 text-green-400 hover:bg-green-400/20 transition-colors"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => handleRespond(invite._id, false)}
                    className="p-2 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Teams */}
      <h2 className="text-lg font-bold mb-3">My Teams</h2>
      {myTeams === undefined ? (
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : myTeams.length === 0 ? (
        <p className="text-gray-500">
          No teams yet. Create one to get started!
        </p>
      ) : (
        <div className="grid gap-2">
          {myTeams.map((team: any) => (
            <Link
              key={team._id}
              href={`/team/${team.slug}`}
              className="bg-[#1a1a3e] rounded-xl p-4 flex items-center justify-between hover:bg-[#22224a] transition-colors"
            >
              <div>
                <p className="font-semibold">{team.name}</p>
                <p className="text-gray-400 text-sm">
                  {team.memberCount} member
                  {team.memberCount !== 1 ? "s" : ""} ·{" "}
                  {team.role === "leader" ? "Leader" : "Member"}
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-500" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
