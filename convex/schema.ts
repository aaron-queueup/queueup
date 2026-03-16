import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    username: v.string(),
    avatarUrl: v.optional(v.string()),
    connections: v.optional(
      v.array(
        v.object({
          type: v.string(),
          name: v.string(),
          verified: v.boolean(),
        })
      )
    ),
    discordUsername: v.optional(v.string()),
    riotId: v.optional(v.string()),
    riotVerified: v.optional(v.boolean()),
    preferredRoles: v.optional(v.array(v.string())),
    slug: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_slug", ["slug"])
    .searchIndex("search_username", { searchField: "username" })
    .searchIndex("search_discordUsername", { searchField: "discordUsername" }),

  organizations: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    avatarUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_ownerId", ["ownerId"]),

  orgMembers: defineTable({
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("organizer")),
    addedAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["orgId", "userId"]),

  teams: defineTable({
    name: v.string(),
    slug: v.string(),
    leaderId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_leaderId", ["leaderId"])
    .index("by_slug", ["slug"])
    .searchIndex("search_name", { searchField: "name" }),

  teamMembers: defineTable({
    teamId: v.id("teams"),
    userId: v.id("users"),
    role: v.union(v.literal("leader"), v.literal("member")),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined")
    ),
    teamRole: v.optional(v.string()),
    isSub: v.optional(v.boolean()),
    invitedAt: v.number(),
    joinedAt: v.optional(v.number()),
  })
    .index("by_team", ["teamId"])
    .index("by_user", ["userId"])
    .index("by_team_user", ["teamId", "userId"])
    .index("by_team_status", ["teamId", "status"]),

  tournaments: defineTable({
    name: v.string(),
    orgId: v.id("organizations"),
    description: v.optional(v.string()),
    capacity: v.number(),
    teamSize: v.number(),
    inviteCode: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("completed")
    ),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_orgId", ["orgId"])
    .index("by_inviteCode", ["inviteCode"]),

  applications: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    teamId: v.id("teams"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("denied"),
      v.literal("blocked")
    ),
    appliedAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_status", ["tournamentId", "status"])
    .index("by_tournament_user", ["tournamentId", "userId"])
    .index("by_tournament_team", ["tournamentId", "teamId"])
    .index("by_user", ["userId"]),

  participants: defineTable({
    tournamentId: v.id("tournaments"),
    userId: v.id("users"),
    teamId: v.id("teams"),
    seed: v.optional(v.number()),
    joinedAt: v.number(),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_user", ["userId"])
    .index("by_tournament_user", ["tournamentId", "userId"])
    .index("by_tournament_team", ["tournamentId", "teamId"]),

  matches: defineTable({
    tournamentId: v.id("tournaments"),
    round: v.number(),
    matchIndex: v.number(),
    team1Id: v.optional(v.id("teams")),
    team2Id: v.optional(v.id("teams")),
    winnerTeamId: v.optional(v.id("teams")),
    status: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("completed")
    ),
  })
    .index("by_tournament", ["tournamentId"])
    .index("by_tournament_round", ["tournamentId", "round"]),
});
