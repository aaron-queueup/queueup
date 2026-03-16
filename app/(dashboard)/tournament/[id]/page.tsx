"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  Copy,
  Share2,
  Clock,
  CheckCircle,
  XCircle,
  Ban,
  Check,
  X,
  Users,
  Info,
} from "lucide-react";
import Bracket from "./Bracket";
import { useModal } from "@/app/ModalProvider";
import { ShimmerTournamentDetail } from "@/app/Shimmer";

export default function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const tournament = useQuery(api.tournaments.get, {
    id: id as Id<"tournaments">,
  });
  const currentUser = useQuery(api.users.current, {});
  const matches = useQuery(api.matches.listByTournament, {
    tournamentId: id as Id<"tournaments">,
  });
  const myApplication = useQuery(api.tournaments.myApplication, {
    tournamentId: id as Id<"tournaments">,
  });
  const applications = useQuery(api.tournaments.getApplications, {
    tournamentId: id as Id<"tournaments">,
  });
  const myTeams = useQuery(api.teams.myTeams, {});

  const applyToTournament = useMutation(api.tournaments.apply);
  const reviewApplication = useMutation(api.tournaments.reviewApplication);
  const startBracket = useMutation(api.tournaments.startBracket);
  const reportWinner = useMutation(api.matches.reportWinner);

  const { alert, confirm, prompt } = useModal();
  const [appFilter, setAppFilter] = useState<string>("pending");
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"teams"> | null>(
    null
  );

  if (!tournament || !currentUser) {
    return <ShimmerTournamentDetail />;
  }

  const isParticipant = tournament.teams?.some((t: any) =>
    t.members?.some((m: any) => m.userId === currentUser._id)
  );
  const isFull = tournament.teamCount >= tournament.capacity;

  const eligibleTeams =
    myTeams?.filter(
      (t: any) =>
        t.role === "leader" && t.memberCount >= tournament.teamSize
    ) ?? [];

  const handleApply = async () => {
    if (!selectedTeamId) return alert({ title: "Error", message: "Select a team to apply with" });
    try {
      await applyToTournament({
        tournamentId: id as Id<"tournaments">,
        teamId: selectedTeamId,
      });
      alert({ title: "Applied!", message: "Your team's application has been submitted." });
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(tournament.inviteCode);
    alert({ title: "Copied!", message: "Invite code copied to clipboard." });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          text: `Join my tournament "${tournament.name}" on Queue Up!\n\nInvite code: ${tournament.inviteCode}`,
        });
      } catch {}
    } else {
      handleCopyCode();
    }
  };

  const handleStart = async () => {
    const ok = await confirm({
      title: "Start Bracket",
      message: "This will lock registrations and generate the bracket. Continue?",
      confirmLabel: "Start",
    });
    if (!ok) return;
    try {
      await startBracket({ tournamentId: id as Id<"tournaments"> });
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
  };

  const handleReview = async (
    applicationId: Id<"applications">,
    decision: "approved" | "denied" | "blocked",
    teamName: string
  ) => {
    const labels = { approved: "Approve", denied: "Deny", blocked: "Block" };
    const ok = await confirm({
      title: `${labels[decision]} ${teamName}?`,
      message: decision === "blocked" ? "This team will not be able to reapply." : undefined,
      confirmLabel: labels[decision],
      variant: decision === "approved" ? "primary" : "danger",
    });
    if (!ok) return;
    reviewApplication({ applicationId, decision });
  };

  const handleReportWinner = async (
    matchId: Id<"matches">,
    t1Id?: Id<"teams">,
    t2Id?: Id<"teams">,
    t1Name?: string | null,
    t2Name?: string | null
  ) => {
    const options: { label: string; value: string }[] = [];
    if (t1Id && t1Name) options.push({ label: t1Name, value: "1" });
    if (t2Id && t2Name) options.push({ label: t2Name, value: "2" });

    const choice = await prompt({
      title: "Report Winner",
      message: "Which team won this match?",
      options,
      confirmLabel: "Confirm",
    });
    if (choice === "1" && t1Id) {
      reportWinner({ matchId, winnerTeamId: t1Id });
    } else if (choice === "2" && t2Id) {
      reportWinner({ matchId, winnerTeamId: t2Id });
    }
  };

  const filteredApps = applications?.filter((a) =>
    appFilter === "all" ? true : a.status === appFilter
  );

  const statusColors: Record<string, string> = {
    open: "text-green-400 bg-green-400/10",
    in_progress: "text-yellow-400 bg-yellow-400/10",
    completed: "text-gray-400 bg-gray-400/10",
  };

  const hasBracket =
    (tournament.status === "in_progress" || tournament.status === "completed") &&
    matches &&
    matches.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <p className="text-gray-400 mt-1">{tournament.orgName}</p>
            <div className="flex items-center gap-3 mt-2">
              <span
                className={`text-xs font-semibold uppercase px-2 py-1 rounded ${statusColors[tournament.status]}`}
              >
                {tournament.status.replace("_", " ")}
              </span>
              {isFull && tournament.status === "open" && (
                <span className="text-xs font-semibold uppercase px-2 py-1 rounded text-red-400 bg-red-400/10">
                  Full
                </span>
              )}
              <span className="text-gray-400 text-sm">
                {tournament.teamCount}/{tournament.capacity} teams ·{" "}
                {tournament.teamSize}v{tournament.teamSize}
              </span>
            </div>
            {tournament.description && (
              <p className="text-gray-400 mt-2 text-sm max-w-xl">
                {tournament.description}
              </p>
            )}
          </div>

          {/* Invite Code (compact) — hidden when full */}
          {tournament.status === "open" && !isFull && (
            <div className="bg-[#1a1a3e] rounded-xl p-3 flex items-center gap-3">
              <div>
                <p className="text-gray-400 text-xs">Invite Code</p>
                <p className="text-[#5865F2] font-bold tracking-widest">
                  {tournament.inviteCode}
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className="text-[#5865F2] hover:text-[#4752C4] transition-colors"
              >
                <Copy size={16} />
              </button>
              <button
                onClick={handleShare}
                className="text-[#5865F2] hover:text-[#4752C4] transition-colors"
              >
                <Share2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* User status + apply (inline) */}
        <div className="mt-4">
          {tournament.status === "open" && !isParticipant && !myApplication && !isFull && (
            <div>
              {eligibleTeams.length > 0 ? (
                <div className="flex items-center gap-3 flex-wrap">
                  {eligibleTeams.map((team: any) => (
                    <button
                      key={team._id}
                      onClick={() => setSelectedTeamId(team._id)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        selectedTeamId === team._id
                          ? "bg-[#5865F2] text-white"
                          : "bg-[#1a1a3e] text-gray-400 hover:bg-[#22224a]"
                      }`}
                    >
                      {team.name} ({team.memberCount})
                    </button>
                  ))}
                  <button
                    onClick={handleApply}
                    disabled={!selectedTeamId}
                    className="px-6 py-2 rounded-lg text-sm font-semibold bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-60 disabled:bg-gray-600"
                  >
                    Apply
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Info size={16} className="shrink-0" />
                  <span>
                    Need a team with {tournament.teamSize} members (as leader)
                    to apply.
                  </span>
                </div>
              )}
            </div>
          )}
          {myApplication && (
            <div className="flex items-center gap-2">
              {myApplication.status === "pending" && (
                <>
                  <Clock size={16} className="text-yellow-400" />
                  <span className="text-yellow-400 text-sm">
                    Application pending
                  </span>
                </>
              )}
              {myApplication.status === "approved" && (
                <>
                  <CheckCircle size={16} className="text-green-400" />
                  <span className="text-green-400 text-sm">
                    Your team is in!
                  </span>
                </>
              )}
              {myApplication.status === "denied" && (
                <>
                  <XCircle size={16} className="text-red-400" />
                  <span className="text-red-400 text-sm">
                    Application denied
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Start Bracket (organizer) */}
        {tournament.status === "open" &&
          applications &&
          tournament.teamCount >= 2 && (
            <button
              onClick={handleStart}
              className="mt-4 px-6 py-2 rounded-lg bg-[#5865F2] text-white text-sm font-semibold hover:bg-[#4752C4] transition-colors"
            >
              Start Bracket
            </button>
          )}
      </div>

      {/* Two-column layout: Bracket (main) + Sidebar */}
      <div className="flex gap-6 items-start">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Bracket */}
          {hasBracket && (
            <Bracket
              matches={matches!}
              isOrganizer={!!applications}
              onReportWinner={handleReportWinner}
            />
          )}

          {/* Teams list (when no bracket, show as main content) */}
          {!hasBracket &&
            tournament.teams &&
            tournament.teams.length > 0 && (
              <div>
                <h2 className="text-lg font-bold mb-3">
                  Teams ({tournament.teamCount})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {tournament.teams.map((team: any) => (
                    <div
                      key={team.teamId}
                      className="bg-[#1a1a3e] rounded-xl p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Users size={14} className="text-[#5865F2]" />
                        <span className="font-semibold text-sm">
                          {team.teamName}
                        </span>
                      </div>
                      <p className="pl-5 text-gray-400 text-xs">
                        {team.members
                          .map((m: any) => m.username)
                          .join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>

        {/* Sidebar */}
        <div className="w-80 shrink-0 hidden lg:block space-y-6">
          {/* Applications (organizer view) */}
          {applications && applications.length > 0 && (
            <div>
              <h2 className="text-sm font-bold mb-2 uppercase tracking-wider text-gray-400">
                Applications
              </h2>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {["pending", "approved", "denied", "blocked", "all"].map(
                  (f) => (
                    <button
                      key={f}
                      onClick={() => setAppFilter(f)}
                      className={`px-2 py-1 rounded text-xs font-semibold capitalize transition-colors ${
                        appFilter === f
                          ? "bg-[#5865F2] text-white"
                          : "bg-[#1a1a3e] text-gray-400 hover:bg-[#22224a]"
                      }`}
                    >
                      {f}
                      {f === "pending" &&
                        ` (${applications.filter((a) => a.status === "pending").length})`}
                    </button>
                  )
                )}
              </div>
              <div className="space-y-1.5 max-h-96 overflow-y-auto">
                {filteredApps?.map((app) => (
                  <div
                    key={app._id}
                    className="bg-[#1a1a3e] rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {app.teamName}
                      </p>
                      <p className="text-gray-400 text-xs truncate">
                        {app.teamMembers
                          ?.map((m: any) => m.username)
                          .join(", ")}
                      </p>
                    </div>
                    {app.status === "pending" ? (
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button
                          onClick={() =>
                            handleReview(
                              app._id,
                              "approved",
                              app.teamName ?? ""
                            )
                          }
                          className="p-1.5 rounded bg-green-400/10 text-green-400 hover:bg-green-400/20 transition-colors"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() =>
                            handleReview(
                              app._id,
                              "denied",
                              app.teamName ?? ""
                            )
                          }
                          className="p-1.5 rounded bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                        >
                          <X size={14} />
                        </button>
                        <button
                          onClick={() =>
                            handleReview(
                              app._id,
                              "blocked",
                              app.teamName ?? ""
                            )
                          }
                          className="p-1.5 rounded bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                        >
                          <Ban size={12} />
                        </button>
                      </div>
                    ) : (
                      <span
                        className={`text-xs font-semibold capitalize shrink-0 ml-2 ${
                          app.status === "approved"
                            ? "text-green-400"
                            : "text-red-400"
                        }`}
                      >
                        {app.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Participants sidebar (when bracket is showing) */}
          {hasBracket &&
            tournament.teams &&
            tournament.teams.length > 0 && (
              <div>
                <h2 className="text-sm font-bold mb-2 uppercase tracking-wider text-gray-400">
                  Teams ({tournament.teamCount})
                </h2>
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {tournament.teams.map((team: any) => (
                    <div
                      key={team.teamId}
                      className="bg-[#1a1a3e] rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Users size={12} className="text-[#5865F2]" />
                        <span className="font-semibold text-sm">
                          {team.teamName}
                        </span>
                      </div>
                      <p className="pl-5 text-gray-400 text-xs mt-0.5">
                        {team.members
                          .map((m: any) => m.username)
                          .join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Mobile fallback: show sidebar content below on smaller screens */}
      <div className="lg:hidden mt-6 space-y-6">
        {applications && applications.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3">Applications</h2>
            <div className="flex flex-wrap gap-2 mb-3">
              {["pending", "approved", "denied", "blocked", "all"].map(
                (f) => (
                  <button
                    key={f}
                    onClick={() => setAppFilter(f)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold capitalize transition-colors ${
                      appFilter === f
                        ? "bg-[#5865F2] text-white"
                        : "bg-[#1a1a3e] text-gray-400 hover:bg-[#22224a]"
                    }`}
                  >
                    {f}
                    {f === "pending" &&
                      ` (${applications.filter((a) => a.status === "pending").length})`}
                  </button>
                )
              )}
            </div>
            <div className="grid gap-2">
              {filteredApps?.map((app) => (
                <div
                  key={app._id}
                  className="bg-[#1a1a3e] rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold">{app.teamName}</p>
                    <p className="text-gray-400 text-xs mt-1">
                      {app.teamMembers
                        ?.map((m: any) => m.username)
                        .join(", ")}
                    </p>
                  </div>
                  {app.status === "pending" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleReview(
                            app._id,
                            "approved",
                            app.teamName ?? ""
                          )
                        }
                        className="p-2 rounded-lg bg-green-400/10 text-green-400 hover:bg-green-400/20 transition-colors"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        onClick={() =>
                          handleReview(
                            app._id,
                            "denied",
                            app.teamName ?? ""
                          )
                        }
                        className="p-2 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                      >
                        <X size={16} />
                      </button>
                      <button
                        onClick={() =>
                          handleReview(
                            app._id,
                            "blocked",
                            app.teamName ?? ""
                          )
                        }
                        className="p-2 rounded-lg bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                      >
                        <Ban size={14} />
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`text-xs font-semibold capitalize ${
                        app.status === "approved"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {app.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {hasBracket &&
          tournament.teams &&
          tournament.teams.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3">
                Teams ({tournament.teamCount})
              </h2>
              <div className="grid gap-2">
                {tournament.teams.map((team: any) => (
                  <div
                    key={team.teamId}
                    className="bg-[#1a1a3e] rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Users size={14} className="text-[#5865F2]" />
                      <span className="font-semibold text-sm">
                        {team.teamName}
                      </span>
                    </div>
                    <p className="pl-5 text-gray-400 text-xs">
                      {team.members.map((m: any) => m.username).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
