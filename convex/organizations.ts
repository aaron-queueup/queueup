import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      ownerId: user._id,
      description: args.description,
      createdAt: Date.now(),
    });

    // Add owner as a member
    await ctx.db.insert("orgMembers", {
      orgId,
      userId: user._id,
      role: "owner",
      addedAt: Date.now(),
    });

    return orgId;
  },
});

export const get = query({
  args: { id: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.id);
    if (!org) return null;

    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.id))
      .collect();

    const memberUsers = await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          ...m,
          username: user?.username,
          avatarUrl: user?.avatarUrl,
        };
      })
    );

    const owner = await ctx.db.get(org.ownerId);

    return {
      ...org,
      members: memberUsers,
      ownerName: owner?.username ?? "Unknown",
    };
  },
});

export const myOrgs = query({
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
      .query("orgMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        const members = await ctx.db
          .query("orgMembers")
          .withIndex("by_org", (q) => q.eq("orgId", m.orgId))
          .collect();
        return {
          ...org,
          role: m.role,
          memberCount: members.length,
        };
      })
    );
  },
});

export const addOrganizer = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Organization not found");
    if (org.ownerId !== user._id)
      throw new Error("Only the owner can add organizers");

    // Check if already a member
    const existing = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", args.userId)
      )
      .unique();
    if (existing) throw new Error("User is already a member");

    await ctx.db.insert("orgMembers", {
      orgId: args.orgId,
      userId: args.userId,
      role: "organizer",
      addedAt: Date.now(),
    });
  },
});

export const removeOrganizer = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Organization not found");
    if (org.ownerId !== user._id)
      throw new Error("Only the owner can remove organizers");

    const member = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", args.userId)
      )
      .unique();
    if (!member) throw new Error("User is not a member");
    if (member.role === "owner") throw new Error("Cannot remove the owner");

    await ctx.db.delete(member._id);
  },
});

// Search users by Discord name (for adding organizers)
export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    if (args.query.length < 2) return [];

    const [byUsername, byDiscord] = await Promise.all([
      ctx.db
        .query("users")
        .withSearchIndex("search_username", (q) => q.search("username", args.query))
        .take(10),
      ctx.db
        .query("users")
        .withSearchIndex("search_discordUsername", (q) => q.search("discordUsername", args.query))
        .take(10),
    ]);

    // Merge and dedupe
    const seen = new Set<string>();
    const merged = [];
    for (const u of [...byUsername, ...byDiscord]) {
      if (!seen.has(u._id)) {
        seen.add(u._id);
        merged.push(u);
      }
    }

    return merged.slice(0, 10).map((u) => ({
      _id: u._id,
      username: u.username,
      discordUsername: u.discordUsername,
      slug: u.slug,
      avatarUrl: u.avatarUrl,
      riotId: u.riotId,
      riotVerified: u.riotVerified,
      preferredRoles: u.preferredRoles,
    }));
  },
});
