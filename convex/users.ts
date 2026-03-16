import { v } from "convex/values";
import { mutation, query, action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const store = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // identity.name = Discord display name (e.g. "giga")
    // identity.nickname = Discord unique username (e.g. "tatoshimoto")
    const displayName = identity.name ?? "Unknown";
    const discordUsername = (identity.nickname ?? displayName).toLowerCase().trim();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      const updates: any = {};
      if (existing.username !== displayName) {
        updates.username = displayName;
      }
      if (existing.avatarUrl !== identity.pictureUrl) {
        updates.avatarUrl = identity.pictureUrl;
      }
      if (existing.discordUsername !== discordUsername) {
        updates.discordUsername = discordUsername;
      }
      // Slug always matches Discord username
      if (existing.slug !== discordUsername) {
        updates.slug = discordUsername;
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates);
      }
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      username: displayName,
      discordUsername,
      slug: discordUsername,
      avatarUrl: identity.pictureUrl,
      createdAt: Date.now(),
    });
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const getProfileBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!user) return null;

    // Get teams this user is on
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const accepted = memberships.filter((m) => m.status === "accepted");

    const teams = await Promise.all(
      accepted.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        return team
          ? {
              _id: team._id,
              name: team.name,
              slug: team.slug,
              role: m.role,
              teamRole: m.teamRole,
              isSub: m.isSub,
            }
          : null;
      })
    ).then((r) => r.filter(Boolean));

    return {
      _id: user._id,
      username: user.username,
      discordUsername: user.discordUsername,
      avatarUrl: user.avatarUrl,
      riotId: user.riotId,
      riotVerified: user.riotVerified,
      preferredRoles: user.preferredRoles,
      createdAt: user.createdAt,
      teams,
    };
  },
});

export const getMatchHistory = action({
  args: { riotId: v.string() },
  handler: async (_ctx, args) => {
    const apiKey = process.env.RIOT_API_KEY;
    if (!apiKey) return { error: "Riot API key not configured", matches: [], mastery: [] };

    // Parse "Player#NA1" into gameName and tagLine
    const parts = args.riotId.split("#");
    if (parts.length !== 2) return { error: "Invalid Riot ID format", matches: [], mastery: [] };
    const [gameName, tagLine] = parts;

    try {
      // 1. Get PUUID
      const accountRes = await fetch(
        `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?api_key=${apiKey}`
      );
      if (!accountRes.ok) {
        return { error: "Could not find Riot account", matches: [], mastery: [] };
      }
      const account = await accountRes.json();

      // 2. Get recent match IDs (20 matches)
      const matchIdsRes = await fetch(
        `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${account.puuid}/ids?start=0&count=20&api_key=${apiKey}`
      );
      if (!matchIdsRes.ok) {
        return { error: "Could not fetch match list", matches: [], mastery: [] };
      }
      const matchIds: string[] = await matchIdsRes.json();

      // 3. Get match details
      const matches = await Promise.all(
        matchIds.map(async (matchId) => {
          const res = await fetch(
            `https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${apiKey}`
          );
          if (!res.ok) return null;
          const data = await res.json();

          const participant = data.info.participants.find(
            (p: any) => p.puuid === account.puuid
          );
          if (!participant) return null;

          const players = data.info.participants.map((p: any) => ({
            summonerName: p.riotIdGameName || p.summonerName,
            tagLine: p.riotIdTagline || "",
            champion: p.championName,
            kills: p.kills,
            deaths: p.deaths,
            assists: p.assists,
            cs: p.totalMinionsKilled + p.neutralMinionsKilled,
            gold: p.goldEarned,
            damage: p.totalDamageDealtToChampions,
            visionScore: p.visionScore,
            level: p.champLevel,
            win: p.win,
            teamId: p.teamId,
            role: p.teamPosition || p.individualPosition || "",
            puuid: p.puuid,
            items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
          }));

          return {
            matchId,
            champion: participant.championName,
            kills: participant.kills,
            deaths: participant.deaths,
            assists: participant.assists,
            win: participant.win,
            gameMode: data.info.gameMode,
            gameDuration: data.info.gameDuration,
            gameCreation: data.info.gameCreation,
            role: participant.teamPosition || participant.role,
            cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
            players,
            viewerPuuid: account.puuid,
          };
        })
      );

      // 4. Get top champion mastery (NA1 regional endpoint)
      let mastery: any[] = [];
      try {
        const masteryRes = await fetch(
          `https://na1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${account.puuid}/top?count=3&api_key=${apiKey}`
        );
        if (masteryRes.ok) {
          const masteryData = await masteryRes.json();
          // Fetch champion name mapping
          const champRes = await fetch(
            "https://ddragon.leagueoflegends.com/cdn/15.6.1/data/en_US/champion.json"
          );
          let champMap: Record<string, string> = {};
          if (champRes.ok) {
            const champData = await champRes.json();
            for (const [name, data] of Object.entries(champData.data) as any) {
              champMap[data.key] = name;
            }
          }

          mastery = masteryData.map((m: any) => ({
            championId: m.championId,
            championName: champMap[String(m.championId)] ?? `Champion ${m.championId}`,
            level: m.championLevel,
            points: m.championPoints,
          }));
        }
      } catch {}

      return { error: null, matches: matches.filter(Boolean), mastery };
    } catch (err: any) {
      return { error: err.message, matches: [], mastery: [] };
    }
  },
});

// User sets their Riot ID manually
export const setRiotId = mutation({
  args: { riotId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    // Check if it matches a Discord connection
    const riotConnection = user.connections?.find(
      (c) => c.type === "riotgames" || c.type === "leagueoflegends"
    );

    const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();
    const isVerified =
      !!riotConnection &&
      normalize(riotConnection.name) === normalize(args.riotId);

    await ctx.db.patch(user._id, {
      riotId: isVerified ? riotConnection.name : args.riotId,
      riotVerified: isVerified,
    });

    return { verified: isVerified };
  },
});

// Sync Discord connections and re-check verification
export const syncConnections = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const clerkSecret = process.env.CLERK_SECRET_KEY;
    if (!clerkSecret) throw new Error("Clerk secret key not configured");

    // Get the Discord OAuth access token from Clerk
    const tokenRes = await fetch(
      `https://api.clerk.com/v1/users/${identity.subject}/oauth_access_tokens/oauth_discord`,
      {
        headers: { Authorization: `Bearer ${clerkSecret}` },
      }
    );

    if (!tokenRes.ok) {
      throw new Error("Failed to get Discord access token from Clerk");
    }

    const tokens = await tokenRes.json();
    if (!tokens.length || !tokens[0].token) {
      throw new Error("No Discord access token available");
    }

    const discordToken = tokens[0].token;

    // Fetch Discord connections
    const connectionsRes = await fetch(
      "https://discord.com/api/v10/users/@me/connections",
      {
        headers: { Authorization: `Bearer ${discordToken}` },
      }
    );

    if (!connectionsRes.ok) {
      throw new Error("Failed to fetch Discord connections. Make sure the 'connections' scope is enabled.");
    }

    const discordConnections = await connectionsRes.json();

    const connections = discordConnections.map(
      (c: { type: string; name: string; verified: boolean }) => ({
        type: c.type,
        name: c.name,
        verified: c.verified,
      })
    );

    await ctx.runMutation(internal.users.updateConnections, {
      clerkId: identity.subject,
      connections,
    });

    return connections;
  },
});

export const updateConnections = internalMutation({
  args: {
    clerkId: v.string(),
    connections: v.array(
      v.object({
        type: v.string(),
        name: v.string(),
        verified: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) throw new Error("User not found");

    // Re-check verification against the user's current riotId
    const riotConnection = args.connections.find(
      (c) => c.type === "riotgames" || c.type === "leagueoflegends"
    );

    const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();
    const isVerified =
      !!user.riotId &&
      !!riotConnection &&
      normalize(riotConnection.name) === normalize(user.riotId);

    await ctx.db.patch(user._id, {
      connections: args.connections,
      riotVerified: isVerified,
    });
  },
});

export const setPreferredRoles = mutation({
  args: { roles: v.array(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { preferredRoles: args.roles });
  },
});

export const removeRiotId = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, {
      riotId: undefined,
      riotVerified: undefined,
    });
  },
});
