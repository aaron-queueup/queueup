import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

async function requireAuth(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("User not found");
  return user;
}

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    if (!args.name.trim()) throw new Error("Team name is required");

    const slug = generateSlug(args.name.trim());

    const teamId = await ctx.db.insert("teams", {
      name: args.name.trim(),
      slug,
      leaderId: user._id,
      createdAt: Date.now(),
    });

    await ctx.db.insert("teamMembers", {
      teamId,
      userId: user._id,
      role: "leader",
      status: "accepted",
      invitedAt: Date.now(),
      joinedAt: Date.now(),
    });

    return teamId;
  },
});

export const get = query({
  args: { id: v.id("teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.id);
    if (!team) return null;

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.id))
      .collect();

    const memberDetails = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          ...m,
          username: user?.username ?? "Unknown",
          avatarUrl: user?.avatarUrl,
        };
      })
    );

    const leader = await ctx.db.get(team.leaderId);

    return {
      ...team,
      members: memberDetails,
      leaderName: leader?.username ?? "Unknown",
    };
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!team) return null;

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();

    const memberDetails = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          ...m,
          username: user?.username ?? "Unknown",
          avatarUrl: user?.avatarUrl,
        };
      })
    );

    const leader = await ctx.db.get(team.leaderId);

    return {
      ...team,
      members: memberDetails,
      leaderName: leader?.username ?? "Unknown",
    };
  },
});

export const myTeams = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const accepted = memberships.filter((m) => m.status === "accepted");

    return await Promise.all(
      accepted.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        if (!team) return null;

        const allMembers = await ctx.db
          .query("teamMembers")
          .withIndex("by_team_status", (q) =>
            q.eq("teamId", m.teamId).eq("status", "accepted")
          )
          .collect();

        return {
          ...team,
          role: m.role,
          memberCount: allMembers.length,
        };
      })
    ).then((results) => results.filter(Boolean));
  },
});

export const getInvites = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const pending = memberships.filter((m) => m.status === "pending");

    return await Promise.all(
      pending.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        const leader = team ? await ctx.db.get(team.leaderId) : null;
        return {
          ...m,
          teamName: team?.name ?? "Unknown",
          leaderName: leader?.username ?? "Unknown",
        };
      })
    );
  },
});

export const invite = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.leaderId !== user._id)
      throw new Error("Only the team leader can invite members");

    // Check if already a member
    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .unique();

    if (existing) {
      if (existing.status === "accepted")
        throw new Error("User is already on this team");
      if (existing.status === "pending")
        throw new Error("User already has a pending invite");
      // If declined, allow re-invite by updating
      await ctx.db.patch(existing._id, {
        status: "pending",
        invitedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("teamMembers", {
      teamId: args.teamId,
      userId: args.userId,
      role: "member",
      status: "pending",
      invitedAt: Date.now(),
    });
  },
});

export const respondToInvite = mutation({
  args: {
    teamMemberId: v.id("teamMembers"),
    accept: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const membership = await ctx.db.get(args.teamMemberId);
    if (!membership) throw new Error("Invite not found");
    if (membership.userId !== user._id)
      throw new Error("This invite is not for you");
    if (membership.status !== "pending")
      throw new Error("Invite already responded to");

    await ctx.db.patch(args.teamMemberId, {
      status: args.accept ? "accepted" : "declined",
      joinedAt: args.accept ? Date.now() : undefined,
    });
  },
});

export const removeMember = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.leaderId !== user._id)
      throw new Error("Only the team leader can remove members");
    if (args.userId === user._id)
      throw new Error("Cannot remove yourself as leader");

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .unique();

    if (!membership) throw new Error("User is not on this team");

    await ctx.db.delete(membership._id);
  },
});

export const leave = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.leaderId === user._id)
      throw new Error("Team leader cannot leave. Delete the team instead.");

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("You are not on this team");

    await ctx.db.delete(membership._id);
  },
});

export const setMemberRole = mutation({
  args: {
    teamId: v.id("teams"),
    userId: v.id("users"),
    teamRole: v.optional(v.string()),
    isSub: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.leaderId !== user._id)
      throw new Error("Only the team leader can assign roles");

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_user", (q) =>
        q.eq("teamId", args.teamId).eq("userId", args.userId)
      )
      .unique();

    if (!membership) throw new Error("User is not on this team");

    const patch: any = {};
    if (args.teamRole !== undefined) patch.teamRole = args.teamRole || undefined;
    if (args.isSub !== undefined) patch.isSub = args.isSub;

    await ctx.db.patch(membership._id, patch);
  },
});

export const getTournamentHistory = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    // Find all applications this team has made
    const applications = await ctx.db
      .query("applications")
      .filter((q) => q.eq(q.field("teamId"), args.teamId))
      .collect();

    const results = await Promise.all(
      applications.map(async (app) => {
        const tournament = await ctx.db.get(app.tournamentId);
        if (!tournament) return null;

        const org = await ctx.db.get(tournament.orgId);

        // Check if they won (find final match)
        let placement: string | null = null;
        if (app.status === "approved" && tournament.status !== "open") {
          const matches = await ctx.db
            .query("matches")
            .withIndex("by_tournament", (q) =>
              q.eq("tournamentId", tournament._id)
            )
            .collect();

          if (matches.length > 0) {
            const totalRounds = Math.max(...matches.map((m) => m.round));
            const finalMatch = matches.find(
              (m) => m.round === totalRounds && m.matchIndex === 0
            );

            if (finalMatch?.winnerTeamId === args.teamId) {
              placement = "1st";
            } else if (
              finalMatch &&
              (finalMatch.team1Id === args.teamId ||
                finalMatch.team2Id === args.teamId)
            ) {
              placement = "2nd";
            } else {
              // Check if they were in semis
              const semis = matches.filter(
                (m) =>
                  m.round === totalRounds - 1 &&
                  (m.team1Id === args.teamId || m.team2Id === args.teamId)
              );
              if (semis.length > 0) {
                placement = "Top 4";
              }
            }
          }
        }

        return {
          tournamentId: tournament._id,
          tournamentName: tournament.name,
          orgName: org?.name ?? "Unknown",
          status: tournament.status,
          teamSize: tournament.teamSize,
          applicationStatus: app.status,
          placement,
        };
      })
    );

    return results.filter(Boolean);
  },
});
