import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function requireOrgMember(ctx: any, orgId: any, userId: any) {
  const member = await ctx.db
    .query("orgMembers")
    .withIndex("by_org_user", (q: any) =>
      q.eq("orgId", orgId).eq("userId", userId)
    )
    .unique();
  if (!member) throw new Error("Not a member of this organization");
  return member;
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

export const list = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    let tournaments;
    if (args.status) {
      tournaments = await ctx.db
        .query("tournaments")
        .withIndex("by_status", (q) => q.eq("status", args.status as any))
        .collect();
    } else {
      tournaments = await ctx.db.query("tournaments").collect();
    }

    return await Promise.all(
      tournaments.map(async (t) => {
        // Count unique teams in participants
        const participants = await ctx.db
          .query("participants")
          .withIndex("by_tournament", (q) => q.eq("tournamentId", t._id))
          .collect();
        const teamIds = new Set(participants.map((p) => p.teamId));
        const org = await ctx.db.get(t.orgId);
        const pendingApps = await ctx.db
          .query("applications")
          .withIndex("by_tournament_status", (q) =>
            q.eq("tournamentId", t._id).eq("status", "pending")
          )
          .collect();
        return {
          ...t,
          teamCount: teamIds.size,
          participantCount: teamIds.size,
          pendingCount: pendingApps.length,
          orgName: org?.name ?? "Unknown",
        };
      })
    );
  },
});

export const get = query({
  args: { id: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.id);
    if (!tournament) return null;

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.id))
      .collect();

    // Get unique team IDs
    const seenTeamIds = new Set<string>();
    const uniqueTeamIds: (typeof participants)[0]["teamId"][] = [];
    for (const p of participants) {
      if (!seenTeamIds.has(p.teamId)) {
        seenTeamIds.add(p.teamId);
        uniqueTeamIds.push(p.teamId);
      }
    }

    const teamDetails = await Promise.all(
      uniqueTeamIds.map(async (teamId) => {
        const team = await ctx.db.get(teamId);
        const members = participants.filter((p) => p.teamId === teamId);
        const memberDetails = await Promise.all(
          members.map(async (p) => {
            const user = await ctx.db.get(p.userId);
            return {
              ...p,
              username: user?.username,
              avatarUrl: user?.avatarUrl,
              riotId: user?.riotId,
              riotVerified: user?.riotVerified ?? false,
            };
          })
        );
        return {
          teamId: teamId as string,
          teamName: team?.name ?? "Unknown",
          members: memberDetails,
          seed: members[0]?.seed,
        };
      })
    );

    const org = await ctx.db.get(tournament.orgId);

    return {
      ...tournament,
      teams: teamDetails,
      participants: teamDetails,
      teamCount: teamDetails.length,
      participantCount: teamDetails.length,
      orgName: org?.name ?? "Unknown",
    };
  },
});

export const getByInviteCode = query({
  args: { inviteCode: v.string() },
  handler: async (ctx, args) => {
    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!tournament) return null;

    const org = await ctx.db.get(tournament.orgId);
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
      .collect();
    const teamIds = new Set(participants.map((p) => p.teamId));

    return {
      ...tournament,
      orgName: org?.name ?? "Unknown",
      teamCount: teamIds.size,
      participantCount: teamIds.size,
    };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    orgId: v.id("organizations"),
    description: v.optional(v.string()),
    capacity: v.number(),
    teamSize: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    await requireOrgMember(ctx, args.orgId, user._id);

    const inviteCode = generateInviteCode();

    return await ctx.db.insert("tournaments", {
      name: args.name,
      orgId: args.orgId,
      description: args.description,
      capacity: args.capacity,
      teamSize: args.teamSize,
      inviteCode,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

export const apply = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    if (tournament.status !== "open")
      throw new Error("Tournament is not open for registration");

    // Validate caller is team leader
    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.leaderId !== user._id)
      throw new Error("Only the team leader can apply");

    // Validate team has enough accepted members
    const acceptedMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_status", (q) =>
        q.eq("teamId", args.teamId).eq("status", "accepted")
      )
      .collect();

    if (acceptedMembers.length < tournament.teamSize)
      throw new Error(
        `Team needs ${tournament.teamSize} members, but only has ${acceptedMembers.length}`
      );

    // Check if team already applied
    const existingTeamApp = await ctx.db
      .query("applications")
      .withIndex("by_tournament_team", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("teamId", args.teamId)
      )
      .unique();

    if (existingTeamApp) {
      if (existingTeamApp.status === "blocked")
        throw new Error("Your team has been blocked from this tournament");
      if (existingTeamApp.status === "denied")
        throw new Error("Your team's application was denied");
      throw new Error("Your team has already applied");
    }

    return await ctx.db.insert("applications", {
      tournamentId: args.tournamentId,
      userId: user._id,
      teamId: args.teamId,
      status: "pending",
      appliedAt: Date.now(),
    });
  },
});

export const applyByCode = mutation({
  args: {
    inviteCode: v.string(),
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const tournament = await ctx.db
      .query("tournaments")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", args.inviteCode))
      .unique();

    if (!tournament) throw new Error("Invalid invite code");
    if (tournament.status !== "open")
      throw new Error("Tournament is not open for registration");

    const team = await ctx.db.get(args.teamId);
    if (!team) throw new Error("Team not found");
    if (team.leaderId !== user._id)
      throw new Error("Only the team leader can apply");

    const acceptedMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_status", (q) =>
        q.eq("teamId", args.teamId).eq("status", "accepted")
      )
      .collect();

    if (acceptedMembers.length < tournament.teamSize)
      throw new Error(
        `Team needs ${tournament.teamSize} members, but only has ${acceptedMembers.length}`
      );

    const existingTeamApp = await ctx.db
      .query("applications")
      .withIndex("by_tournament_team", (q) =>
        q.eq("tournamentId", tournament._id).eq("teamId", args.teamId)
      )
      .unique();

    if (existingTeamApp) {
      if (existingTeamApp.status === "blocked")
        throw new Error("Your team has been blocked from this tournament");
      if (existingTeamApp.status === "denied")
        throw new Error("Your team's application was denied");
      throw new Error("Your team has already applied");
    }

    await ctx.db.insert("applications", {
      tournamentId: tournament._id,
      userId: user._id,
      teamId: args.teamId,
      status: "pending",
      appliedAt: Date.now(),
    });

    return tournament._id;
  },
});

export const getApplications = query({
  args: {
    tournamentId: v.id("tournaments"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let applications;
    if (args.status) {
      applications = await ctx.db
        .query("applications")
        .withIndex("by_tournament_status", (q) =>
          q
            .eq("tournamentId", args.tournamentId)
            .eq("status", args.status as any)
        )
        .collect();
    } else {
      applications = await ctx.db
        .query("applications")
        .withIndex("by_tournament", (q) =>
          q.eq("tournamentId", args.tournamentId)
        )
        .collect();
    }

    return await Promise.all(
      applications.map(async (a) => {
        const user = await ctx.db.get(a.userId);
        const team = await ctx.db.get(a.teamId);

        // Get team members
        const members = await ctx.db
          .query("teamMembers")
          .withIndex("by_team_status", (q) =>
            q.eq("teamId", a.teamId).eq("status", "accepted")
          )
          .collect();

        const memberDetails = await Promise.all(
          members.map(async (m) => {
            const u = await ctx.db.get(m.userId);
            return {
              userId: m.userId,
              username: u?.username ?? "Unknown",
              avatarUrl: u?.avatarUrl,
              riotId: u?.riotId,
              riotVerified: u?.riotVerified ?? false,
              role: m.role,
            };
          })
        );

        return {
          ...a,
          username: user?.username,
          avatarUrl: user?.avatarUrl,
          teamName: team?.name ?? "Unknown",
          teamMembers: memberDetails,
        };
      })
    );
  },
});

export const reviewApplication = mutation({
  args: {
    applicationId: v.id("applications"),
    decision: v.union(
      v.literal("approved"),
      v.literal("denied"),
      v.literal("blocked")
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const application = await ctx.db.get(args.applicationId);
    if (!application) throw new Error("Application not found");

    const tournament = await ctx.db.get(application.tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    await requireOrgMember(ctx, tournament.orgId, user._id);

    if (application.status !== "pending")
      throw new Error("Application already reviewed");

    await ctx.db.patch(args.applicationId, {
      status: args.decision,
      reviewedAt: Date.now(),
      reviewedBy: user._id,
    });

    // If approved, add ALL accepted team members as participants
    if (args.decision === "approved") {
      // Check capacity (team slots)
      const existingParticipants = await ctx.db
        .query("participants")
        .withIndex("by_tournament", (q) =>
          q.eq("tournamentId", application.tournamentId)
        )
        .collect();

      const existingTeamIds = new Set(
        existingParticipants.map((p) => p.teamId)
      );
      if (existingTeamIds.size >= tournament.capacity)
        throw new Error("Tournament is full");

      // Get all accepted team members
      const teamMembers = await ctx.db
        .query("teamMembers")
        .withIndex("by_team_status", (q) =>
          q.eq("teamId", application.teamId).eq("status", "accepted")
        )
        .collect();

      // Add each team member as a participant
      for (const member of teamMembers) {
        await ctx.db.insert("participants", {
          tournamentId: application.tournamentId,
          userId: member.userId,
          teamId: application.teamId,
          joinedAt: Date.now(),
        });
      }
    }
  },
});

export const myApplication = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;

    // Find applications where the user is the applicant (team leader)
    const app = await ctx.db
      .query("applications")
      .withIndex("by_tournament_user", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("userId", user._id)
      )
      .unique();

    if (app) return app;

    // Also check if user's team applied (user might not be the leader)
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const acceptedTeamIds = memberships
      .filter((m) => m.status === "accepted")
      .map((m) => m.teamId);

    for (const teamId of acceptedTeamIds) {
      const teamApp = await ctx.db
        .query("applications")
        .withIndex("by_tournament_team", (q) =>
          q.eq("tournamentId", args.tournamentId).eq("teamId", teamId)
        )
        .unique();
      if (teamApp) return teamApp;
    }

    return null;
  },
});

export const myTournaments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return [];

    // Tournaments I'm a participant in
    const participations = await ctx.db
      .query("participants")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Tournaments my teams applied to
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const acceptedTeamIds = memberships
      .filter((m) => m.status === "accepted")
      .map((m) => m.teamId);

    const allApps: any[] = [];
    for (const teamId of acceptedTeamIds) {
      const apps = await ctx.db
        .query("applications")
        .withIndex("by_tournament_team", (q) =>
          q.eq("tournamentId", undefined as any).eq("teamId", teamId)
        )
        .collect();
      // Can't use compound index this way, query by team members instead
    }

    // Get applications for user's teams
    const applications: any[] = [];
    for (const teamId of acceptedTeamIds) {
      // Search all applications for this team
      const teamApps = await ctx.db
        .query("applications")
        .filter((q) => q.eq(q.field("teamId"), teamId))
        .collect();
      applications.push(...teamApps);
    }

    const tournamentIds = new Set<string>();
    const all = new Map<string, any>();

    for (const p of participations) {
      tournamentIds.add(p.tournamentId);
    }
    for (const a of applications) {
      tournamentIds.add(a.tournamentId);
    }

    for (const tid of tournamentIds) {
      const t = await ctx.db
        .query("tournaments")
        .filter((q) => q.eq(q.field("_id"), tid))
        .unique();
      if (!t) continue;

      const participants = await ctx.db
        .query("participants")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", t._id))
        .collect();
      const teamIds = new Set(participants.map((p) => p.teamId));
      const org = await ctx.db.get(t.orgId);
      const myApp = applications.find((a) => a.tournamentId === t._id);
      const isParticipant = participations.some(
        (p) => p.tournamentId === t._id
      );

      // Find team name for my application
      let myTeamName: string | null = null;
      if (myApp) {
        const team = await ctx.db.get(myApp.teamId as Id<"teams">);
        myTeamName = team?.name ?? null;
      }

      all.set(t._id, {
        ...t,
        teamCount: teamIds.size,
        participantCount: teamIds.size,
        orgName: org?.name ?? "Unknown",
        isParticipant,
        applicationStatus: myApp?.status ?? null,
        myTeamName,
      });
    }

    return Array.from(all.values());
  },
});

export const startBracket = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    await requireOrgMember(ctx, tournament.orgId, user._id);

    if (tournament.status !== "open") throw new Error("Tournament not open");

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Get unique teams
    const teamIdSet = new Set<string>();
    const teamEntries: { teamId: string; seed?: number }[] = [];
    for (const p of participants) {
      if (!teamIdSet.has(p.teamId)) {
        teamIdSet.add(p.teamId);
        teamEntries.push({ teamId: p.teamId });
      }
    }

    if (teamEntries.length < 2)
      throw new Error("Need at least 2 teams");

    // Shuffle teams
    const shuffled = [...teamEntries].sort(() => Math.random() - 0.5);

    // Assign seeds to participants by team
    for (let i = 0; i < shuffled.length; i++) {
      const teamParticipants = participants.filter(
        (p) => p.teamId === shuffled[i].teamId
      );
      for (const tp of teamParticipants) {
        await ctx.db.patch(tp._id, { seed: i });
      }
    }

    const totalRounds = Math.ceil(Math.log2(tournament.capacity));

    for (let round = 1; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);
      for (let matchIndex = 0; matchIndex < matchesInRound; matchIndex++) {
        if (round === 1) {
          const t1Index = matchIndex * 2;
          const t2Index = matchIndex * 2 + 1;
          const team1 = shuffled[t1Index];
          const team2 = shuffled[t2Index];
          const hasT1 = t1Index < shuffled.length;
          const hasT2 = t2Index < shuffled.length;

          await ctx.db.insert("matches", {
            tournamentId: args.tournamentId,
            round,
            matchIndex,
            team1Id: hasT1 ? (team1.teamId as any) : undefined,
            team2Id: hasT2 ? (team2.teamId as any) : undefined,
            winnerTeamId:
              hasT1 && !hasT2 ? (team1.teamId as any) : undefined,
            status:
              hasT1 && hasT2
                ? "ready"
                : hasT1 && !hasT2
                  ? "completed"
                  : "pending",
          });
        } else {
          await ctx.db.insert("matches", {
            tournamentId: args.tournamentId,
            round,
            matchIndex,
            status: "pending",
          });
        }
      }
    }

    // Advance byes to round 2
    const round1Matches = await ctx.db
      .query("matches")
      .withIndex("by_tournament_round", (q) =>
        q.eq("tournamentId", args.tournamentId).eq("round", 1)
      )
      .collect();

    for (const match of round1Matches) {
      if (match.status === "completed" && match.winnerTeamId) {
        const nextMatchIndex = Math.floor(match.matchIndex / 2);
        const nextMatch = await ctx.db
          .query("matches")
          .withIndex("by_tournament_round", (q) =>
            q.eq("tournamentId", args.tournamentId).eq("round", 2)
          )
          .collect();
        const target = nextMatch.find((m) => m.matchIndex === nextMatchIndex);
        if (target) {
          const isEven = match.matchIndex % 2 === 0;
          await ctx.db.patch(target._id, {
            ...(isEven
              ? { team1Id: match.winnerTeamId }
              : { team2Id: match.winnerTeamId }),
          });
          const updated = await ctx.db.get(target._id);
          if (updated?.team1Id && updated?.team2Id) {
            await ctx.db.patch(target._id, { status: "ready" });
          }
        }
      }
    }

    await ctx.db.patch(args.tournamentId, { status: "in_progress" });
  },
});
