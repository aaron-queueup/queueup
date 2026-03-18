"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import Link from "next/link";
import {
  Star,
  UserIcon,
  Clock,
  XCircle,
  PlusCircle,
  LogOut,
  Trophy,
  Users,
} from "lucide-react";
import { useModal } from "@/app/ModalProvider";
import { ShimmerTeamDetail } from "@/app/Shimmer";

export default function TeamDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const team = useQuery(api.teams.getBySlug, { slug });
  const currentUser = useQuery(api.users.current, {});

  const inviteMember = useMutation(api.teams.invite);
  const removeMember = useMutation(api.teams.removeMember);
  const leaveTeam = useMutation(api.teams.leave);
  const setMemberRole = useMutation(api.teams.setMemberRole);
  const { alert, confirm, prompt } = useModal();

  const [searchQuery, setSearchQuery] = useState("");
  const searchResults = useQuery(
    api.organizations.searchUsers,
    searchQuery.length >= 2 ? { query: searchQuery } : "skip"
  );

  // Fetch tournament history once we have the team
  const tournamentHistory = useQuery(
    api.teams.getTournamentHistory,
    team ? { teamId: team._id } : "skip"
  );

  if (!team || !currentUser) {
    return <ShimmerTeamDetail />;
  }

  const isLeader = team.leaderId === currentUser._id;
  const acceptedMembers = team.members.filter((m) => m.status === "accepted");
  const pendingMembers = team.members.filter((m) => m.status === "pending");

  const existingUserIds = new Set(team.members.map((m) => m.userId));
  const filteredSearchResults = searchResults?.filter(
    (u) => !existingUserIds.has(u._id)
  );

  const handleInvite = async (userId: Id<"users">) => {
    try {
      await inviteMember({ teamId: team._id, userId });
      setSearchQuery("");
      alert({ title: "Invited!", message: "Invite sent successfully." });
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
  };

  const handleRemove = async (userId: Id<"users">, username: string) => {
    const ok = await confirm({
      title: `Remove ${username}?`,
      message: "They will be removed from the team.",
      confirmLabel: "Remove",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await removeMember({ teamId: team._id, userId });
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
  };

  const handleLeave = async () => {
    const ok = await confirm({
      title: "Leave team?",
      message: "You will no longer be a member of this team.",
      confirmLabel: "Leave",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await leaveTeam({ teamId: team._id });
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
  };

  const ROLES = ["Top", "Jungle", "Mid", "Bottom", "Support", "Fill"];

  const handleAssignRole = async (userId: Id<"users">) => {
    const choice = await prompt({
      title: "Assign Role",
      options: [
        ...ROLES.map((r) => ({ label: r, value: r })),
        { label: "None", value: "" },
      ],
      confirmLabel: "Assign",
    });
    if (choice === null) return;
    try {
      await setMemberRole({
        teamId: team._id,
        userId,
        teamRole: choice || undefined,
      });
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
  };

  const handleToggleSub = async (userId: Id<"users">, isSub: boolean) => {
    try {
      await setMemberRole({
        teamId: team._id,
        userId,
        isSub: !isSub,
      });
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
  };

  const statusColors: Record<string, string> = {
    open: "text-green-400 bg-green-400/10",
    in_progress: "text-yellow-400 bg-yellow-400/10",
    completed: "text-gray-400 bg-gray-400/10",
  };

  const placementColors: Record<string, string> = {
    "1st": "text-yellow-400 bg-yellow-400/10",
    "2nd": "text-gray-300 bg-gray-300/10",
    "Top 4": "text-orange-400 bg-orange-400/10",
  };

  const starters = acceptedMembers.filter((m: any) => !m.isSub);
  const subs = acceptedMembers.filter((m: any) => m.isSub);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#5865F2]/15 flex items-center justify-center">
              <Users size={22} className="text-[#5865F2]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{team.name}</h1>
              <p className="text-gray-400 text-sm">
                Led by {team.leaderName} · {acceptedMembers.length} member
                {acceptedMembers.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        {!isLeader && (
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors text-sm font-medium"
          >
            <LogOut size={14} />
            Leave
          </button>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* Left: Roster */}
        <div className="flex-1 min-w-0">
          {/* Invite (leader only) */}
          {isLeader && (
            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
                Invite Members
              </h2>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full bg-[#1a1a3e] rounded-lg px-4 py-3 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-[#5865F2]"
                />
                {filteredSearchResults && filteredSearchResults.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 bg-[#1a1a3e] rounded-lg mt-1 overflow-hidden border border-white/5 shadow-xl">
                    {filteredSearchResults.map((user) => (
                      <button
                        key={user._id}
                        onClick={() => handleInvite(user._id)}
                        className="w-full flex items-center justify-between p-3 hover:bg-[#22224a] transition-colors border-b border-[#0f0f23] last:border-0"
                      >
                        <span className="text-sm">{user.username}</span>
                        <PlusCircle size={16} className="text-[#5865F2]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pending Invites */}
          {pendingMembers.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
                Pending Invites
              </h2>
              <div className="grid gap-2">
                {pendingMembers.map((m) => (
                  <div
                    key={m._id}
                    className="bg-[#1a1a3e] rounded-lg px-4 py-3 flex items-center gap-3"
                  >
                    <Clock size={14} className="text-yellow-400" />
                    <span className="flex-1 text-sm">{m.username}</span>
                    {isLeader && (
                      <button
                        onClick={() => handleRemove(m.userId, m.username)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Starters */}
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
            Starters
          </h2>
          <div className="grid gap-2 mb-6">
            {starters.map((m: any) => (
              <div key={m._id} className="bg-[#1a1a3e] rounded-lg p-4 flex items-center gap-4">
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} className="w-10 h-10 rounded-full" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold">
                      {m.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link href={`/user/${m.username.toLowerCase()}`} className="font-semibold text-sm hover:text-[#5865F2] transition-colors">
                      {m.username}
                    </Link>
                    {m.role === "leader" && (
                      <span className="text-yellow-400 text-[10px] font-semibold bg-yellow-400/10 px-1.5 py-0.5 rounded uppercase">
                        Leader
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {m.teamRole ? (
                      <span className="text-xs font-semibold bg-[#5865F2]/15 text-[#8b95f5] px-2 py-0.5 rounded">
                        {m.teamRole}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">No role</span>
                    )}
                    {isLeader && (
                      <button
                        onClick={() => handleAssignRole(m.userId)}
                        className="text-[10px] text-[#5865F2] hover:text-[#4752C4] transition-colors"
                      >
                        {m.teamRole ? "change" : "assign"}
                      </button>
                    )}
                  </div>
                </div>
                {isLeader && m.role !== "leader" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleSub(m.userId, false)}
                      className="text-[10px] text-gray-500 hover:text-orange-400 transition-colors"
                    >
                      Move to sub
                    </button>
                    <button
                      onClick={() => handleRemove(m.userId, m.username)}
                      className="text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <XCircle size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Substitutes */}
          {(subs.length > 0 || isLeader) && (
            <>
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
                Substitutes
              </h2>
              {subs.length === 0 ? (
                <p className="text-gray-500 text-sm mb-6">No substitutes</p>
              ) : (
                <div className="grid gap-2 mb-6">
                  {subs.map((m: any) => (
                    <div key={m._id} className="bg-[#1a1a3e] rounded-lg p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-400/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-orange-400">
                          {m.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link href={`/user/${m.username.toLowerCase()}`} className="font-semibold text-sm hover:text-[#5865F2] transition-colors">
                            {m.username}
                          </Link>
                          <span className="text-orange-400 text-[10px] font-semibold bg-orange-400/10 px-1.5 py-0.5 rounded">
                            SUB
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {m.teamRole && (
                            <span className="text-xs font-semibold bg-[#5865F2]/15 text-[#8b95f5] px-2 py-0.5 rounded">
                              {m.teamRole}
                            </span>
                          )}
                        </div>
                      </div>
                      {isLeader && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleSub(m.userId, true)}
                            className="text-[10px] text-gray-500 hover:text-green-400 transition-colors"
                          >
                            Move to starter
                          </button>
                          <button
                            onClick={() => handleRemove(m.userId, m.username)}
                            className="text-red-400/60 hover:text-red-400 transition-colors"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Tournament History */}
        <div className="w-full lg:w-80 lg:shrink-0">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
            Tournament History
          </h2>
          {tournamentHistory === undefined ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="shimmer h-20 rounded-lg" />
              ))}
            </div>
          ) : tournamentHistory.length === 0 ? (
            <div className="bg-[#1a1a3e] rounded-lg p-6 text-center">
              <Trophy size={24} className="text-gray-500 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No tournaments yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tournamentHistory.map((t: any) => (
                <Link
                  key={t.tournamentId}
                  href={`/tournament/${t.tournamentId}`}
                  className="block bg-[#1a1a3e] rounded-lg p-3 hover:bg-[#22224a] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm truncate">{t.tournamentName}</p>
                    {t.placement && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ml-2 ${placementColors[t.placement] ?? "text-gray-400 bg-gray-400/10"}`}>
                        {t.placement}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">{t.orgName}</span>
                    <span className="text-gray-600">·</span>
                    <span className="text-gray-400 text-xs">{t.teamSize}v{t.teamSize}</span>
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${statusColors[t.status]}`}
                    >
                      {t.status.replace("_", " ")}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
