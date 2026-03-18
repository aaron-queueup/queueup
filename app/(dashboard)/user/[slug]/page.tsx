"use client";

import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Users,
  Swords,
  AlertTriangle,
  RefreshCw,
  Settings,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Gamepad2,
} from "lucide-react";
import { ShimmerProfile, Shimmer } from "@/app/Shimmer";
import { useModal } from "@/app/ModalProvider";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

const ROLES = ["Top", "Jungle", "Mid", "Bottom", "Support", "Fill"];

const CONNECTIONS: Record<string, { label: string; color: string; logo: string }> = {
  riotgames: { label: "Riot Games", color: "#D32936", logo: "https://cdn.simpleicons.org/riotgames/D32936" },
  leagueoflegends: { label: "League of Legends", color: "#C89B3C", logo: "https://cdn.simpleicons.org/leagueoflegends/C89B3C" },
  steam: { label: "Steam", color: "#fff", logo: "https://cdn.simpleicons.org/steam/fff" },
  twitch: { label: "Twitch", color: "#9146FF", logo: "https://cdn.simpleicons.org/twitch/9146FF" },
  youtube: { label: "YouTube", color: "#FF0000", logo: "https://cdn.simpleicons.org/youtube/FF0000" },
  twitter: { label: "Twitter / X", color: "#fff", logo: "https://cdn.simpleicons.org/x/fff" },
  github: { label: "GitHub", color: "#fff", logo: "https://cdn.simpleicons.org/github/fff" },
  spotify: { label: "Spotify", color: "#1DB954", logo: "https://cdn.simpleicons.org/spotify/1DB954" },
  xbox: { label: "Xbox", color: "#107C10", logo: "https://cdn.simpleicons.org/xbox/107C10" },
  playstation: { label: "PlayStation", color: "#003087", logo: "https://cdn.simpleicons.org/playstation/003087" },
  epicgames: { label: "Epic Games", color: "#fff", logo: "https://cdn.simpleicons.org/epicgames/fff" },
};

export default function UserProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const profile = useQuery(api.users.getProfileBySlug, { slug });
  const currentUser = useQuery(api.users.current, {});
  const getMatchHistory = useAction(api.users.getMatchHistory);

  // Own-profile mutations
  const setRiotId = useMutation(api.users.setRiotId);
  const removeRiotId = useMutation(api.users.removeRiotId);
  const setPreferredRoles = useMutation(api.users.setPreferredRoles);
  const syncConnections = useAction(api.users.syncConnections);
  const { alert, confirm } = useModal();

  const [matches, setMatches] = useState<any[] | null>(null);
  const [mastery, setMastery] = useState<any[] | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  // Own-profile state
  const [riotInput, setRiotInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isOwnProfile = currentUser && profile && currentUser._id === profile._id;

  useEffect(() => {
    if (isOwnProfile && currentUser?.riotId) setRiotInput(currentUser.riotId);
  }, [isOwnProfile, currentUser?.riotId]);

  const fetchMatches = () => {
    if (!profile?.riotId || !profile.riotVerified) return;
    setLoadingMatches(true);
    setMatchError(null);
    getMatchHistory({ riotId: profile.riotId })
      .then((result) => {
        if (!result) return;
        setMatches(result.matches ?? []);
        setMastery(result.mastery ?? []);
        if (result.error) setMatchError(result.error);
      })
      .catch((err) => setMatchError(err.message))
      .finally(() => setLoadingMatches(false));
  };

  useEffect(() => {
    fetchMatches();
  }, [profile?.riotId, profile?.riotVerified]);

  const handleSetRiotId = async () => {
    if (!riotInput.trim()) return alert({ title: "Error", message: "Enter your Riot ID" });
    setSaving(true);
    try { await syncConnections(); } catch {}
    try {
      const result = await setRiotId({ riotId: riotInput.trim() });
      alert({
        title: result.verified ? "Verified!" : "Not Verified",
        message: result.verified
          ? "Your Riot ID has been verified through your Discord connection."
          : "Saved but couldn't be verified. Make sure this Riot account is connected to your Discord.",
      });
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
    setSaving(false);
  };

  const handleRemoveRiot = async () => {
    const ok = await confirm({ title: "Remove Riot ID?", variant: "danger", confirmLabel: "Remove" });
    if (!ok) return;
    await removeRiotId();
    setRiotInput("");
  };

  const handleSync = async () => {
    setSyncing(true);
    try { await syncConnections(); } catch {}
    setSyncing(false);
  };


  if (profile === undefined) return <ShimmerProfile />;
  if (profile === null) {
    return (
      <div className="text-center mt-16">
        <p className="text-gray-400 text-lg">User not found</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* Left: Profile info */}
        <div className="w-full lg:w-80 lg:shrink-0">
          {/* Card */}
          <div className="bg-[#1a1a3e] rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-4 mb-4">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.username} className="w-16 h-16 rounded-full" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#5865F2] flex items-center justify-center">
                  <span className="text-2xl font-bold">{profile.username.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">{profile.username}</h1>
                {profile.discordUsername && profile.discordUsername !== profile.username.toLowerCase() && (
                  <p className="text-gray-500 text-sm">@{profile.discordUsername}</p>
                )}
              </div>
            </div>

            {/* Riot ID */}
            {isOwnProfile ? (
              <div className="mb-4">
                {currentUser.riotId && currentUser.riotVerified ? (
                  <div className="flex items-center justify-between bg-[#0f0f23] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-green-400" />
                      <span className="text-sm font-medium">{currentUser.riotId}</span>
                    </div>
                    <button onClick={handleRemoveRiot} className="text-gray-500 text-xs hover:text-gray-300 transition-colors">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    {currentUser.riotId && !currentUser.riotVerified && (
                      <div className="flex items-center gap-2 bg-yellow-400/5 p-2 rounded-lg mb-2">
                        <AlertTriangle size={12} className="text-yellow-400 shrink-0" />
                        <span className="text-yellow-400 text-xs">Not verified</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={riotInput}
                        onChange={(e) => setRiotInput(e.target.value)}
                        placeholder="Riot ID (e.g. Player#NA1)"
                        className="flex-1 bg-[#0f0f23] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:ring-1 focus:ring-[#5865F2]"
                      />
                      <button
                        onClick={handleSetRiotId}
                        disabled={saving}
                        className="px-3 py-2 bg-[#5865F2] text-white text-xs font-semibold rounded-lg hover:bg-[#4752C4] transition-colors disabled:opacity-60"
                      >
                        {saving ? "..." : "Verify"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : profile.riotId ? (
              <div className="flex items-center gap-2 bg-[#0f0f23] rounded-lg px-3 py-2 mb-4">
                <ShieldCheck size={14} className={profile.riotVerified ? "text-green-400" : "text-gray-500"} />
                <span className="text-sm font-medium">{profile.riotId}</span>
              </div>
            ) : null}

            {/* Preferred Roles */}
            <div className="mb-4">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
                Preferred Roles
              </p>
              {isOwnProfile ? (
                <div className="flex flex-wrap gap-1.5">
                  {ROLES.map((role) => {
                    const isSelected = currentUser.preferredRoles?.includes(role);
                    return (
                      <button
                        key={role}
                        onClick={() => {
                          const current = currentUser.preferredRoles ?? [];
                          const next = isSelected ? current.filter((r) => r !== role) : [...current, role];
                          setPreferredRoles({ roles: next });
                        }}
                        className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                          isSelected ? "bg-[#5865F2] text-white" : "bg-[#0f0f23] text-gray-400 hover:bg-[#22224a]"
                        }`}
                      >
                        {role}
                      </button>
                    );
                  })}
                </div>
              ) : profile.preferredRoles && profile.preferredRoles.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {profile.preferredRoles.map((role) => (
                    <span key={role} className="px-2.5 py-1 rounded text-xs font-semibold bg-[#5865F2]/15 text-[#8b95f5]">
                      {role}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-xs">No roles set</p>
              )}
            </div>

            <p className="text-gray-600 text-xs">
              Member since{" "}
              {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Teams */}
          {profile.teams && profile.teams.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Teams</p>
              <div className="space-y-2">
                {profile.teams.map((team: any) => (
                  <Link key={team._id} href={`/team/${team.slug}`} className="block bg-[#1a1a3e] rounded-lg p-3 hover:bg-[#22224a] transition-colors">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-[#5865F2]" />
                      <span className="font-semibold text-sm">{team.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 pl-5">
                      {team.teamRole && <span className="text-[10px] font-semibold bg-[#5865F2]/15 text-[#8b95f5] px-1.5 py-0.5 rounded">{team.teamRole}</span>}
                      {team.role === "leader" && <span className="text-[10px] font-semibold bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded uppercase">Leader</span>}
                      {team.isSub && <span className="text-[10px] font-semibold bg-orange-400/10 text-orange-400 px-1.5 py-0.5 rounded">SUB</span>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Own-profile: Settings section */}
          {isOwnProfile && (
            <div>
              {/* Discord Connections */}
              <div className="mb-3">
                <div className="w-full bg-[#1a1a3e] rounded-lg px-4 py-2.5 flex items-center justify-between">
                  <button
                    onClick={() => setSettingsOpen(!settingsOpen)}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <span className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                      Discord Connections
                      {currentUser.connections && currentUser.connections.length > 0 && (
                        <span className="ml-2 bg-[#5865F2]/20 text-[#5865F2] text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {currentUser.connections.length}
                        </span>
                      )}
                    </span>
                    {settingsOpen ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
                  </button>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="text-[#5865F2] hover:text-[#4752C4] transition-colors disabled:opacity-60"
                  >
                    <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                  </button>
                </div>
                {settingsOpen && (
                  <div className="mt-1 space-y-1">
                    {currentUser.connections && currentUser.connections.length > 0 ? (
                      currentUser.connections.map((conn, i) => {
                        const info = CONNECTIONS[conn.type];
                        return (
                          <div key={`${conn.type}-${i}`} className="bg-[#1a1a3e] rounded-lg px-4 py-2 flex items-center gap-3">
                            <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 bg-white/5">
                              {info?.logo ? (
                                <img src={info.logo} alt={info.label} className="w-4 h-4" />
                              ) : (
                                <Gamepad2 size={14} className="text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{conn.name}</p>
                              <p className="text-gray-500 text-[10px]">{info?.label ?? conn.type}</p>
                            </div>
                            {conn.verified && <CheckCircle size={12} className="text-green-400" />}
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-xs text-center py-3">No connections found</p>
                    )}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* Right: Match History */}
        <div className="flex-1 min-w-0">
          {/* Champion Mastery */}
          {mastery && mastery.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">
                Highest Mastery
              </h2>
              <div className="flex gap-3">
                {mastery.map((m: any, i: number) => (
                  <div key={m.championId} className="bg-[#1a1a3e] rounded-xl p-3 flex items-center gap-3 flex-1">
                    <div className="relative">
                      <img
                        src={`https://ddragon.leagueoflegends.com/cdn/15.6.1/img/champion/${m.championName}.png`}
                        alt={m.championName}
                        className="w-12 h-12 rounded-lg"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#0f0f23] border border-[#1a1a3e] flex items-center justify-center text-[10px] font-bold text-gray-300">
                        {i + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{m.championName}</p>
                      <p className="text-[#5865F2] text-xs font-semibold">
                        Mastery {m.level}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {m.points >= 1000000
                          ? `${(m.points / 1000000).toFixed(1)}M`
                          : m.points >= 1000
                            ? `${(m.points / 1000).toFixed(0)}K`
                            : m.points}{" "}
                        pts
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
              Recent Matches
            </h2>
            {profile.riotId && profile.riotVerified && (
              <button
                onClick={fetchMatches}
                disabled={loadingMatches}
                className="text-[#5865F2] hover:text-[#4752C4] transition-colors disabled:opacity-60"
              >
                <RefreshCw size={14} className={loadingMatches ? "animate-spin" : ""} />
              </button>
            )}
          </div>

          {!profile.riotId || !profile.riotVerified ? (
            <div className="bg-[#1a1a3e] rounded-xl p-8 text-center">
              <Swords size={32} className="text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {!profile.riotId ? "No Riot ID linked" : "Riot ID not verified"}
              </p>
              <p className="text-gray-600 text-xs mt-1">Match history requires a verified Riot ID</p>
            </div>
          ) : loadingMatches ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Shimmer key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : matchError && (!matches || matches.length === 0) ? (
            <div className="bg-[#1a1a3e] rounded-xl p-8 text-center">
              <p className="text-red-400 text-sm">{matchError}</p>
            </div>
          ) : matches && matches.length > 0 ? (
            <div className="space-y-2">
              {matches.map((match: any) => {
                const isExpanded = expandedMatch === match.matchId;
                const team1 = match.players?.filter((p: any) => p.teamId === 100) ?? [];
                const team2 = match.players?.filter((p: any) => p.teamId === 200) ?? [];

                return (
                  <div key={match.matchId}>
                    <button
                      onClick={() => setExpandedMatch(isExpanded ? null : match.matchId)}
                      className={`w-full rounded-lg p-4 flex items-center gap-4 border-l-4 text-left transition-colors ${
                        match.win
                          ? "bg-green-400/5 border-green-400 hover:bg-green-400/8"
                          : "bg-red-400/5 border-red-400 hover:bg-red-400/8"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#0f0f23] flex items-center justify-center shrink-0 overflow-hidden">
                        <img
                          src={`https://ddragon.leagueoflegends.com/cdn/15.6.1/img/champion/${match.champion}.png`}
                          alt={match.champion}
                          className="w-8 h-8 rounded"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{match.champion}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${match.win ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
                            {match.win ? "WIN" : "LOSS"}
                          </span>
                          {match.role && match.role !== "Invalid" && (
                            <span className="text-gray-500 text-xs">{match.role}</span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mt-0.5">
                          {match.gameMode} · {formatDuration(match.gameDuration)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-sm">
                          <span className="text-green-400 font-bold">{match.kills}</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-red-400 font-bold">{match.deaths}</span>
                          <span className="text-gray-500">/</span>
                          <span className="text-blue-400 font-bold">{match.assists}</span>
                        </div>
                        <p className="text-gray-500 text-xs">{match.cs} CS · {timeAgo(match.gameCreation)}</p>
                      </div>
                      <ChevronDown size={14} className={`text-gray-500 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {/* Scoreboard */}
                    {isExpanded && match.players && (
                      <div className="bg-[#0f0f23] rounded-b-lg border border-t-0 border-[#1a1a3e] overflow-x-auto">
                        {[team1, team2].map((team, teamIdx) => (
                          <div key={teamIdx}>
                            <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                              (teamIdx === 0 ? team[0]?.win : team[0]?.win)
                                ? "text-green-400 bg-green-400/5"
                                : "text-red-400 bg-red-400/5"
                            }`}>
                              {team[0]?.win ? "Victory" : "Defeat"} — {teamIdx === 0 ? "Blue" : "Red"} Side
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500 text-[10px]">
                                  <th className="text-left px-3 py-1 font-medium">Player</th>
                                  <th className="text-center px-2 py-1 font-medium">KDA</th>
                                  <th className="text-center px-2 py-1 font-medium">CS</th>
                                  <th className="text-center px-2 py-1 font-medium">Dmg</th>
                                  <th className="text-center px-2 py-1 font-medium">Gold</th>
                                  <th className="text-center px-2 py-1 font-medium">Items</th>
                                </tr>
                              </thead>
                              <tbody>
                                {team.map((p: any, pIdx: number) => {
                                  const isViewer = p.puuid === match.viewerPuuid;
                                  return (
                                    <tr key={pIdx} className={`border-t border-[#1a1a3e] ${isViewer ? "bg-[#5865F2]/5" : ""}`}>
                                      <td className="px-3 py-2">
                                        <div className="flex items-center gap-2">
                                          <img
                                            src={`https://ddragon.leagueoflegends.com/cdn/15.6.1/img/champion/${p.champion}.png`}
                                            alt={p.champion}
                                            className="w-6 h-6 rounded"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                          />
                                          <div>
                                            <span className={`text-xs ${isViewer ? "text-[#5865F2] font-semibold" : "text-white"}`}>
                                              {p.summonerName}
                                            </span>
                                            {p.role && <span className="text-gray-600 text-[10px] ml-1">{p.role}</span>}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="text-center px-2 py-2">
                                        <span className="text-green-400">{p.kills}</span>
                                        <span className="text-gray-500">/</span>
                                        <span className="text-red-400">{p.deaths}</span>
                                        <span className="text-gray-500">/</span>
                                        <span className="text-blue-400">{p.assists}</span>
                                      </td>
                                      <td className="text-center px-2 py-2 text-gray-300">{p.cs}</td>
                                      <td className="text-center px-2 py-2 text-gray-300">
                                        {p.damage >= 1000 ? `${(p.damage / 1000).toFixed(1)}k` : p.damage}
                                      </td>
                                      <td className="text-center px-2 py-2 text-yellow-400/70">
                                        {p.gold >= 1000 ? `${(p.gold / 1000).toFixed(1)}k` : p.gold}
                                      </td>
                                      <td className="px-2 py-2">
                                        <div className="flex gap-0.5">
                                          {p.items?.filter((id: number) => id > 0).map((itemId: number, idx: number) => (
                                            <img
                                              key={idx}
                                              src={`https://ddragon.leagueoflegends.com/cdn/15.6.1/img/item/${itemId}.png`}
                                              alt=""
                                              className="w-5 h-5 rounded"
                                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                            />
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#1a1a3e] rounded-xl p-8 text-center">
              <Swords size={32} className="text-gray-500 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No recent matches</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
