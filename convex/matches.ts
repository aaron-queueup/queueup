import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByTournament = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    return await Promise.all(
      matches.map(async (m) => {
        const team1 = m.team1Id ? await ctx.db.get(m.team1Id) : null;
        const team2 = m.team2Id ? await ctx.db.get(m.team2Id) : null;
        return {
          ...m,
          team1Name: team1?.name ?? null,
          team2Name: team2?.name ?? null,
        };
      })
    );
  },
});

export const reportWinner = mutation({
  args: {
    matchId: v.id("matches"),
    winnerTeamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    const tournament = await ctx.db.get(match.tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    const orgMember = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", tournament.orgId).eq("userId", user._id)
      )
      .unique();
    if (!orgMember)
      throw new Error("Only organizers can report results");

    if (match.status === "completed")
      throw new Error("Match already completed");

    if (args.winnerTeamId !== match.team1Id && args.winnerTeamId !== match.team2Id)
      throw new Error("Winner must be a team in this match");

    await ctx.db.patch(args.matchId, {
      winnerTeamId: args.winnerTeamId,
      status: "completed",
    });

    const allMatches = await ctx.db
      .query("matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", match.tournamentId))
      .collect();
    const totalRounds = Math.max(...allMatches.map((m) => m.round));

    // If this was the final, mark tournament complete
    if (match.round === totalRounds) {
      await ctx.db.patch(match.tournamentId, { status: "completed" });
      return;
    }

    // Advance winner to next round
    const nextRound = match.round + 1;
    const nextMatchIndex = Math.floor(match.matchIndex / 2);

    const nextMatch = allMatches.find(
      (m) => m.round === nextRound && m.matchIndex === nextMatchIndex
    );

    if (nextMatch) {
      const isEven = match.matchIndex % 2 === 0;
      await ctx.db.patch(nextMatch._id, {
        ...(isEven
          ? { team1Id: args.winnerTeamId }
          : { team2Id: args.winnerTeamId }),
      });

      const updated = await ctx.db.get(nextMatch._id);
      if (updated?.team1Id && updated?.team2Id) {
        await ctx.db.patch(nextMatch._id, { status: "ready" });
      }
    }
  },
});
