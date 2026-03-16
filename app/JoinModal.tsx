"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { Id } from "@/convex/_generated/dataModel";
import { X, Ticket } from "lucide-react";
import { useModal } from "@/app/ModalProvider";

// --- Context ---

interface JoinModalContextType {
  openJoinModal: () => void;
}

const JoinModalContext = createContext<JoinModalContextType | null>(null);

export function useJoinModal() {
  const ctx = useContext(JoinModalContext);
  if (!ctx) throw new Error("useJoinModal must be used within JoinModalProvider");
  return ctx;
}

// --- Provider ---

export function JoinModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openJoinModal = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  return (
    <JoinModalContext.Provider value={{ openJoinModal }}>
      {children}
      {open && <JoinModalContent onClose={close} />}
    </JoinModalContext.Provider>
  );
}

// --- Modal Content ---

function JoinModalContent({ onClose }: { onClose: () => void }) {
  const applyByCode = useMutation(api.tournaments.applyByCode);
  const myTeams = useQuery(api.teams.myTeams, {});
  const router = useRouter();
  const { alert } = useModal();

  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"teams"> | null>(null);

  const tournamentInfo = useQuery(
    api.tournaments.getByInviteCode,
    code.trim().length >= 4 ? { inviteCode: code.trim() } : "skip"
  );

  const leaderTeams = myTeams?.filter((t: any) => t.role === "leader") ?? [];
  const eligibleTeams = tournamentInfo
    ? leaderTeams.filter((t: any) => t.memberCount >= tournamentInfo.teamSize)
    : leaderTeams;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleJoin = async () => {
    if (!code.trim()) return alert({ title: "Error", message: "Enter an invite code" });
    if (!selectedTeamId) return alert({ title: "Error", message: "Select a team to apply with" });

    setJoining(true);
    try {
      const tournamentId = await applyByCode({
        inviteCode: code.trim(),
        teamId: selectedTeamId,
      });
      onClose();
      alert({ title: "Applied!", message: "Your team's application has been submitted." });
      router.push(`/tournament/${tournamentId}`);
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
    setJoining(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a1a3e] rounded-2xl w-full max-w-md shadow-2xl border border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#5865F2]/10 flex items-center justify-center">
              <Ticket size={20} className="text-[#5865F2]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Join Tournament</h2>
              <p className="text-gray-500 text-xs">Enter an invite code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter invite code"
            autoFocus
            className="w-full bg-[#0f0f23] rounded-lg px-4 py-3.5 text-lg text-center text-white placeholder-gray-500 tracking-widest mb-4 outline-none focus:ring-2 focus:ring-[#5865F2]"
          />

          {tournamentInfo && (
            <div className="bg-[#0f0f23] rounded-lg p-3 mb-4">
              <p className="font-semibold text-sm">{tournamentInfo.name}</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {tournamentInfo.orgName} · {tournamentInfo.teamSize}v
                {tournamentInfo.teamSize} · {tournamentInfo.teamCount}/
                {tournamentInfo.capacity} teams
              </p>
            </div>
          )}

          {eligibleTeams.length > 0 && (
            <div className="mb-4">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Select your team
              </p>
              <div className="grid gap-1.5">
                {eligibleTeams.map((team: any) => (
                  <button
                    key={team._id}
                    onClick={() => setSelectedTeamId(team._id)}
                    className={`text-left p-3 rounded-lg text-sm font-semibold transition-colors ${
                      selectedTeamId === team._id
                        ? "bg-[#5865F2] text-white"
                        : "bg-[#0f0f23] text-gray-400 hover:bg-[#22224a]"
                    }`}
                  >
                    {team.name} ({team.memberCount})
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={joining || !selectedTeamId}
            className="w-full bg-[#5865F2] text-white py-3 rounded-lg font-semibold hover:bg-[#4752C4] transition-colors disabled:opacity-40"
          >
            {joining ? "Applying..." : "Apply with Team"}
          </button>
        </div>
      </div>
    </div>
  );
}
