import { mutation } from "./_generated/server";

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

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const FAKE_USERS = [
  { username: "shadowlord99", riotId: "ShadowLord#NA1" },
  { username: "xNova_", riotId: "xNova#EUW" },
  { username: "PixelDust", riotId: "PixelDust#NA2" },
  { username: "zephyr_blade", riotId: "ZephyrBlade#KR1" },
  { username: "CrimsonTide", riotId: "CrimsonTide#NA1" },
  { username: "lunarfox", riotId: "LunarFox#EUW" },
  { username: "IronMaiden42", riotId: "IronMaiden#NA1" },
  { username: "stormchaser", riotId: "StormChaser#BR1" },
  { username: "ArcticWolf", riotId: "ArcticWolf#NA2" },
  { username: "voidwalkerX", riotId: "VoidWalker#EUW" },
  { username: "NeonRush", riotId: "NeonRush#KR1" },
  { username: "blazetrail", riotId: "BlazeTrail#NA1" },
  { username: "PhantomAce", riotId: "PhantomAce#NA2" },
  { username: "darkstar_77", riotId: "DarkStar#EUW" },
  { username: "TurboFist", riotId: "TurboFist#BR1" },
  { username: "skypirate", riotId: "SkyPirate#NA1" },
  { username: "RogueSniper", riotId: "RogueSniper#KR1" },
  { username: "hexburn", riotId: "HexBurn#EUW" },
  { username: "WarpDrive", riotId: "WarpDrive#NA2" },
  { username: "eclipseMoon", riotId: "EclipseMoon#NA1" },
  { username: "ThunderClap", riotId: "ThunderClap#BR1" },
  { username: "frostbyte_", riotId: "FrostByte#EUW" },
  { username: "VenomStrike", riotId: "VenomStrike#NA1" },
  { username: "cyberknightX", riotId: "CyberKnight#KR1" },
];

const TEAM_NAMES = [
  "Shadow Wolves",
  "Nova Esports",
  "Crimson Empire",
  "Lunar Eclipse",
  "Iron Vanguard",
  "Storm Legion",
  "Arctic Foxes",
  "Void Reapers",
];

export const run = mutation({
  args: {},
  handler: async (ctx) => {
    // Find the real user (giga)
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated — run this while signed in");

    const me = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!me) throw new Error("User not found");

    // Create fake users
    const fakeUserIds = [];
    for (const fake of FAKE_USERS) {
      const id = await ctx.db.insert("users", {
        clerkId: `fake_${fake.username}_${Date.now()}`,
        username: fake.username,
        riotId: fake.riotId,
        riotVerified: Math.random() > 0.3,
        createdAt: Date.now() - Math.floor(Math.random() * 30 * 86400000),
      });
      fakeUserIds.push(id);
    }

    // Create an org for the real user
    const orgId = await ctx.db.insert("organizations", {
      name: "Grindset Esports",
      ownerId: me._id,
      description: "Competitive gaming organization",
      createdAt: Date.now(),
    });
    await ctx.db.insert("orgMembers", {
      orgId,
      userId: me._id,
      role: "owner",
      addedAt: Date.now(),
    });

    // Create a second org (run by a fake user)
    const org2Id = await ctx.db.insert("organizations", {
      name: "Nexus Gaming",
      ownerId: fakeUserIds[0],
      description: "Premier esports league",
      createdAt: Date.now(),
    });
    await ctx.db.insert("orgMembers", {
      orgId: org2Id,
      userId: fakeUserIds[0],
      role: "owner",
      addedAt: Date.now(),
    });

    // Create teams — 8 teams of 3 players each
    // Team 1: real user + 2 fakes (user is leader)
    const myTeamId = await ctx.db.insert("teams", {
      name: "Giga Squad",
      slug: generateSlug("Giga Squad"),
      leaderId: me._id,
      createdAt: Date.now(),
    });
    await ctx.db.insert("teamMembers", {
      teamId: myTeamId,
      userId: me._id,
      role: "leader",
      status: "accepted",
      invitedAt: Date.now(),
      joinedAt: Date.now(),
    });
    await ctx.db.insert("teamMembers", {
      teamId: myTeamId,
      userId: fakeUserIds[0],
      role: "member",
      status: "accepted",
      invitedAt: Date.now(),
      joinedAt: Date.now(),
    });
    await ctx.db.insert("teamMembers", {
      teamId: myTeamId,
      userId: fakeUserIds[1],
      role: "member",
      status: "accepted",
      invitedAt: Date.now(),
      joinedAt: Date.now(),
    });

    // Pending invite on user's team
    await ctx.db.insert("teamMembers", {
      teamId: myTeamId,
      userId: fakeUserIds[2],
      role: "member",
      status: "pending",
      invitedAt: Date.now(),
    });

    // Create 7 more teams (fake leaders)
    const allTeamIds = [myTeamId];
    for (let i = 0; i < 7; i++) {
      const leaderIdx = i * 3 + 3; // offset past the users already used
      if (leaderIdx + 2 >= fakeUserIds.length) break;

      const teamId = await ctx.db.insert("teams", {
        name: TEAM_NAMES[i],
        slug: generateSlug(TEAM_NAMES[i]),
        leaderId: fakeUserIds[leaderIdx],
        createdAt: Date.now(),
      });
      // Leader
      await ctx.db.insert("teamMembers", {
        teamId,
        userId: fakeUserIds[leaderIdx],
        role: "leader",
        status: "accepted",
        invitedAt: Date.now(),
        joinedAt: Date.now(),
      });
      // 2 members
      await ctx.db.insert("teamMembers", {
        teamId,
        userId: fakeUserIds[leaderIdx + 1],
        role: "member",
        status: "accepted",
        invitedAt: Date.now(),
        joinedAt: Date.now(),
      });
      await ctx.db.insert("teamMembers", {
        teamId,
        userId: fakeUserIds[leaderIdx + 2],
        role: "member",
        status: "accepted",
        invitedAt: Date.now(),
        joinedAt: Date.now(),
      });
      allTeamIds.push(teamId);
    }

    // A pending team invite from someone else's team TO the real user
    if (allTeamIds.length > 1) {
      await ctx.db.insert("teamMembers", {
        teamId: allTeamIds[1],
        userId: me._id,
        role: "member",
        status: "pending",
        invitedAt: Date.now(),
      });
    }

    // Tournament 1: 3v3, 8 teams, OPEN — run by real user's org
    const t1Id = await ctx.db.insert("tournaments", {
      name: "Spring Showdown 2026",
      orgId,
      description:
        "The biggest 3v3 tournament of the season. Top teams compete for glory.",
      capacity: 8,
      teamSize: 3,
      inviteCode: generateInviteCode(),
      status: "open",
      createdAt: Date.now(),
    });

    // Apply real user's team (approved) + 3 other teams (1 approved, 1 pending, 1 denied)
    // My team — approved
    await ctx.db.insert("applications", {
      tournamentId: t1Id,
      userId: me._id,
      teamId: myTeamId,
      status: "approved",
      appliedAt: Date.now() - 86400000,
      reviewedAt: Date.now() - 43200000,
      reviewedBy: me._id,
    });
    // Add my team as participants
    await ctx.db.insert("participants", {
      tournamentId: t1Id,
      userId: me._id,
      teamId: myTeamId,
      joinedAt: Date.now(),
    });
    await ctx.db.insert("participants", {
      tournamentId: t1Id,
      userId: fakeUserIds[0],
      teamId: myTeamId,
      joinedAt: Date.now(),
    });
    await ctx.db.insert("participants", {
      tournamentId: t1Id,
      userId: fakeUserIds[1],
      teamId: myTeamId,
      joinedAt: Date.now(),
    });

    // Team 2 — approved
    if (allTeamIds.length > 1) {
      const t2Leader = (await ctx.db.get(allTeamIds[1]))!.leaderId;
      await ctx.db.insert("applications", {
        tournamentId: t1Id,
        userId: t2Leader,
        teamId: allTeamIds[1],
        status: "approved",
        appliedAt: Date.now() - 72000000,
        reviewedAt: Date.now() - 36000000,
        reviewedBy: me._id,
      });
      const t2Members = await ctx.db
        .query("teamMembers")
        .withIndex("by_team_status", (q) =>
          q.eq("teamId", allTeamIds[1]).eq("status", "accepted")
        )
        .collect();
      for (const m of t2Members) {
        await ctx.db.insert("participants", {
          tournamentId: t1Id,
          userId: m.userId,
          teamId: allTeamIds[1],
          joinedAt: Date.now(),
        });
      }
    }

    // Team 3 — pending
    if (allTeamIds.length > 2) {
      const t3Leader = (await ctx.db.get(allTeamIds[2]))!.leaderId;
      await ctx.db.insert("applications", {
        tournamentId: t1Id,
        userId: t3Leader,
        teamId: allTeamIds[2],
        status: "pending",
        appliedAt: Date.now() - 3600000,
      });
    }

    // Team 4 — pending
    if (allTeamIds.length > 3) {
      const t4Leader = (await ctx.db.get(allTeamIds[3]))!.leaderId;
      await ctx.db.insert("applications", {
        tournamentId: t1Id,
        userId: t4Leader,
        teamId: allTeamIds[3],
        status: "pending",
        appliedAt: Date.now() - 1800000,
      });
    }

    // Team 5 — denied
    if (allTeamIds.length > 4) {
      const t5Leader = (await ctx.db.get(allTeamIds[4]))!.leaderId;
      await ctx.db.insert("applications", {
        tournamentId: t1Id,
        userId: t5Leader,
        teamId: allTeamIds[4],
        status: "denied",
        appliedAt: Date.now() - 50000000,
        reviewedAt: Date.now() - 40000000,
        reviewedBy: me._id,
      });
    }

    // Tournament 2: 3v3, 4 teams, IN PROGRESS with bracket — run by Nexus Gaming
    const t2Id = await ctx.db.insert("tournaments", {
      name: "Nexus Invitational",
      orgId: org2Id,
      description: "Invite-only showdown. Best of the best.",
      capacity: 4,
      teamSize: 3,
      inviteCode: generateInviteCode(),
      status: "in_progress",
      createdAt: Date.now() - 7 * 86400000,
    });

    // Add 4 teams as participants
    const bracketTeams = allTeamIds.slice(0, 4);
    for (const teamId of bracketTeams) {
      const leader = (await ctx.db.get(teamId))!.leaderId;
      await ctx.db.insert("applications", {
        tournamentId: t2Id,
        userId: leader,
        teamId,
        status: "approved",
        appliedAt: Date.now() - 5 * 86400000,
        reviewedAt: Date.now() - 4 * 86400000,
        reviewedBy: fakeUserIds[0],
      });
      const members = await ctx.db
        .query("teamMembers")
        .withIndex("by_team_status", (q) =>
          q.eq("teamId", teamId).eq("status", "accepted")
        )
        .collect();
      for (const m of members) {
        await ctx.db.insert("participants", {
          tournamentId: t2Id,
          userId: m.userId,
          teamId,
          joinedAt: Date.now() - 4 * 86400000,
        });
      }
    }

    // Generate bracket: 4 teams → 2 matches R1, 1 match R2
    // R1M0: team0 vs team1 — completed, team0 won
    await ctx.db.insert("matches", {
      tournamentId: t2Id,
      round: 1,
      matchIndex: 0,
      team1Id: bracketTeams[0],
      team2Id: bracketTeams[1],
      winnerTeamId: bracketTeams[0],
      status: "completed",
    });
    // R1M1: team2 vs team3 — completed, team2 won
    await ctx.db.insert("matches", {
      tournamentId: t2Id,
      round: 1,
      matchIndex: 1,
      team1Id: bracketTeams[2],
      team2Id: bracketTeams[3],
      winnerTeamId: bracketTeams[2],
      status: "completed",
    });
    // R2M0 (Finals): team0 vs team2 — ready
    await ctx.db.insert("matches", {
      tournamentId: t2Id,
      round: 2,
      matchIndex: 0,
      team1Id: bracketTeams[0],
      team2Id: bracketTeams[2],
      status: "ready",
    });

    // Tournament 3: completed tournament
    const t3Id = await ctx.db.insert("tournaments", {
      name: "Winter Classic 2025",
      orgId,
      description: "Last season's championship.",
      capacity: 4,
      teamSize: 3,
      inviteCode: generateInviteCode(),
      status: "completed",
      createdAt: Date.now() - 60 * 86400000,
    });

    // 4 teams, full bracket completed
    const classicTeams = allTeamIds.slice(4, 8).length >= 4
      ? allTeamIds.slice(4, 8)
      : allTeamIds.slice(0, 4);

    for (const teamId of classicTeams) {
      const leader = (await ctx.db.get(teamId))!.leaderId;
      await ctx.db.insert("applications", {
        tournamentId: t3Id,
        userId: leader,
        teamId,
        status: "approved",
        appliedAt: Date.now() - 65 * 86400000,
        reviewedAt: Date.now() - 64 * 86400000,
        reviewedBy: me._id,
      });
      const members = await ctx.db
        .query("teamMembers")
        .withIndex("by_team_status", (q) =>
          q.eq("teamId", teamId).eq("status", "accepted")
        )
        .collect();
      for (const m of members) {
        await ctx.db.insert("participants", {
          tournamentId: t3Id,
          userId: m.userId,
          teamId,
          joinedAt: Date.now() - 64 * 86400000,
        });
      }
    }

    // Full bracket — all completed
    await ctx.db.insert("matches", {
      tournamentId: t3Id,
      round: 1,
      matchIndex: 0,
      team1Id: classicTeams[0],
      team2Id: classicTeams[1],
      winnerTeamId: classicTeams[0],
      status: "completed",
    });
    await ctx.db.insert("matches", {
      tournamentId: t3Id,
      round: 1,
      matchIndex: 1,
      team1Id: classicTeams[2],
      team2Id: classicTeams[3],
      winnerTeamId: classicTeams[3],
      status: "completed",
    });
    await ctx.db.insert("matches", {
      tournamentId: t3Id,
      round: 2,
      matchIndex: 0,
      team1Id: classicTeams[0],
      team2Id: classicTeams[3],
      winnerTeamId: classicTeams[0],
      status: "completed",
    });

    return {
      fakeUsers: fakeUserIds.length,
      teams: allTeamIds.length,
      tournaments: 3,
      orgs: 2,
    };
  },
});
