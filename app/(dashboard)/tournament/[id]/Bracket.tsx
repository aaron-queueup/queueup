"use client";

import { Id } from "@/convex/_generated/dataModel";
import { CheckCircle, Trophy } from "lucide-react";
import { useState, useEffect } from "react";

interface Match {
  _id: Id<"matches">;
  round: number;
  matchIndex: number;
  team1Id?: Id<"teams">;
  team2Id?: Id<"teams">;
  winnerTeamId?: Id<"teams">;
  team1Name?: string | null;
  team2Name?: string | null;
  status: "pending" | "ready" | "completed";
}

interface BracketProps {
  matches: Match[];
  isOrganizer: boolean;
  onReportWinner: (
    matchId: Id<"matches">,
    t1Id?: Id<"teams">,
    t2Id?: Id<"teams">,
    t1Name?: string | null,
    t2Name?: string | null
  ) => void;
}

function MatchCard({
  match,
  isOrganizer,
  onReportWinner,
  isFinal,
}: {
  match: Match;
  isOrganizer: boolean;
  onReportWinner: BracketProps["onReportWinner"];
  isFinal: boolean;
}) {
  const team1Won = match.winnerTeamId === match.team1Id && match.team1Id;
  const team2Won = match.winnerTeamId === match.team2Id && match.team2Id;

  return (
    <div className="relative">
      {isFinal && match.status === "completed" && match.winnerTeamId && (
        <div className="flex items-center justify-center gap-2 mb-2 text-yellow-400">
          <Trophy size={14} />
          <span className="text-xs font-bold uppercase tracking-wider">
            Champion
          </span>
        </div>
      )}
      <div
        className={`bg-[#1a1a3e] rounded-lg overflow-hidden w-48 border ${
          match.status === "ready"
            ? "border-[#5865F2]/40"
            : match.status === "completed"
              ? "border-green-400/20"
              : "border-transparent"
        }`}
      >
        {/* Team 1 */}
        <div
          className={`flex items-center justify-between px-3 py-2 text-sm border-b border-[#0f0f23] ${
            team1Won ? "bg-green-400/10" : ""
          }`}
        >
          <span
            className={`truncate ${
              team1Won
                ? "text-green-400 font-bold"
                : match.team1Name
                  ? "text-white"
                  : "text-gray-500"
            }`}
          >
            {match.team1Name ?? "TBD"}
          </span>
          {team1Won && <CheckCircle size={14} className="text-green-400 shrink-0 ml-1" />}
        </div>
        {/* Team 2 */}
        <div
          className={`flex items-center justify-between px-3 py-2 text-sm ${
            team2Won ? "bg-green-400/10" : ""
          }`}
        >
          <span
            className={`truncate ${
              team2Won
                ? "text-green-400 font-bold"
                : match.team2Name
                  ? "text-white"
                  : "text-gray-500"
            }`}
          >
            {match.team2Name ?? "TBD"}
          </span>
          {team2Won && <CheckCircle size={14} className="text-green-400 shrink-0 ml-1" />}
        </div>
        {/* Report button */}
        {isOrganizer && match.status === "ready" && (
          <button
            onClick={() =>
              onReportWinner(
                match._id,
                match.team1Id,
                match.team2Id,
                match.team1Name,
                match.team2Name
              )
            }
            className="w-full py-1.5 text-xs font-semibold text-[#5865F2] bg-[#5865F2]/10 hover:bg-[#5865F2]/20 transition-colors"
          >
            Report Winner
          </button>
        )}
      </div>
    </div>
  );
}

export default function Bracket({
  matches,
  isOrganizer,
  onReportWinner,
}: BracketProps) {
  // Prevent hydration mismatch — only render SVG connectors on the client
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const rounds = [...new Set(matches.map((m) => m.round))].sort(
    (a, b) => a - b
  );
  const totalRounds = rounds.length;

  if (totalRounds === 0) return null;

  // Group matches by round
  const matchesByRound = new Map<number, Match[]>();
  for (const round of rounds) {
    matchesByRound.set(
      round,
      matches
        .filter((m) => m.round === round)
        .sort((a, b) => a.matchIndex - b.matchIndex)
    );
  }

  // Calculate match card height + gap
  const MATCH_HEIGHT = 76; // px — two team rows + possible report button
  const CONNECTOR_WIDTH = 32; // px — horizontal connector lines

  return (
    <div className="mb-6">
      <h2 className="text-lg font-bold mb-4">Bracket</h2>
      <div className="overflow-x-auto pb-4">
        <div className="flex items-start gap-0 min-w-max">
          {rounds.map((round, roundIdx) => {
            const roundMatches = matchesByRound.get(round) || [];
            const isFinalRound = round === rounds[totalRounds - 1];
            const roundLabel =
              totalRounds === 1
                ? "Final"
                : isFinalRound
                  ? "Finals"
                  : roundIdx === totalRounds - 2
                    ? "Semis"
                    : `Round ${round}`;

            // Each subsequent round has matches spaced further apart
            // to align with the connectors from the previous round
            const spacingMultiplier = Math.pow(2, roundIdx);
            const matchGap = spacingMultiplier * (MATCH_HEIGHT + 16) - MATCH_HEIGHT;

            return (
              <div key={round} className="flex items-start">
                {/* Round column */}
                <div className="flex flex-col">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-3 text-center w-48">
                    {roundLabel}
                  </p>
                  <div
                    className="flex flex-col"
                    style={{ gap: `${matchGap}px` }}
                  >
                    {roundMatches.map((match, matchIdx) => {
                      // Calculate vertical offset to center with previous round's pair
                      const topPadding =
                        roundIdx === 0
                          ? 0
                          : (spacingMultiplier - 1) * (MATCH_HEIGHT + 16) / 2;

                      return (
                        <div
                          key={match._id}
                          style={matchIdx === 0 ? { marginTop: `${topPadding}px` } : {}}
                        >
                          <MatchCard
                            match={match}
                            isOrganizer={isOrganizer}
                            onReportWinner={onReportWinner}
                            isFinal={isFinalRound}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Connectors to next round */}
                {!isFinalRound && mounted && (
                  <div className="flex flex-col" style={{ width: `${CONNECTOR_WIDTH}px` }}>
                    {/* Spacer for header */}
                    <div className="mb-3 h-5" />
                    <svg
                      width={CONNECTOR_WIDTH}
                      height={
                        roundMatches.length * MATCH_HEIGHT +
                        (roundMatches.length - 1) * matchGap +
                        (roundIdx === 0 ? 0 : (spacingMultiplier - 1) * (MATCH_HEIGHT + 16) / 2)
                      }
                      className="overflow-visible"
                    >
                      {roundMatches.map((_match, matchIdx) => {
                        // Only draw connectors for pairs (0-1, 2-3, etc.)
                        if (matchIdx % 2 !== 0) return null;
                        const nextMatch = roundMatches[matchIdx + 1];
                        if (!nextMatch) {
                          // Single match, just draw a horizontal line
                          const topPadding =
                            roundIdx === 0
                              ? 0
                              : (spacingMultiplier - 1) * (MATCH_HEIGHT + 16) / 2;
                          const y = topPadding + MATCH_HEIGHT / 2;
                          return (
                            <line
                              key={matchIdx}
                              x1={0}
                              y1={y}
                              x2={CONNECTOR_WIDTH}
                              y2={y}
                              stroke="#333"
                              strokeWidth={2}
                            />
                          );
                        }

                        const topPadding =
                          roundIdx === 0
                            ? 0
                            : (spacingMultiplier - 1) * (MATCH_HEIGHT + 16) / 2;

                        // Y position of the center of each match
                        const y1 =
                          topPadding +
                          matchIdx * (MATCH_HEIGHT + matchGap) +
                          MATCH_HEIGHT / 2;
                        const y2 =
                          topPadding +
                          (matchIdx + 1) * (MATCH_HEIGHT + matchGap) +
                          MATCH_HEIGHT / 2;
                        const midY = (y1 + y2) / 2;
                        const midX = CONNECTOR_WIDTH / 2;

                        return (
                          <g key={matchIdx}>
                            {/* Horizontal from match 1 */}
                            <line
                              x1={0}
                              y1={y1}
                              x2={midX}
                              y2={y1}
                              stroke="#333"
                              strokeWidth={2}
                            />
                            {/* Horizontal from match 2 */}
                            <line
                              x1={0}
                              y1={y2}
                              x2={midX}
                              y2={y2}
                              stroke="#333"
                              strokeWidth={2}
                            />
                            {/* Vertical connecting them */}
                            <line
                              x1={midX}
                              y1={y1}
                              x2={midX}
                              y2={y2}
                              stroke="#333"
                              strokeWidth={2}
                            />
                            {/* Horizontal to next round */}
                            <line
                              x1={midX}
                              y1={midY}
                              x2={CONNECTOR_WIDTH}
                              y2={midY}
                              stroke="#333"
                              strokeWidth={2}
                            />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
