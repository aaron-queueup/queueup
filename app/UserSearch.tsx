"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck } from "lucide-react";

export function UserSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const results = useQuery(
    api.organizations.searchUsers,
    query.length >= 2 ? { query } : "skip"
  );

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSelect = (slug: string) => {
    setQuery("");
    setOpen(false);
    router.push(`/user/${slug}`);
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 bg-[#1a1a3e] rounded-lg px-3 py-1.5">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search players..."
          className="bg-transparent text-sm text-white placeholder-gray-500 outline-none w-36 sm:w-48"
        />
      </div>

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-[#1a1a3e] rounded-xl border border-white/5 shadow-2xl overflow-hidden z-50 min-w-64">
          {results === undefined ? (
            <div className="px-4 py-3 text-gray-500 text-sm">Searching...</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-3 text-gray-500 text-sm">
              No players found
            </div>
          ) : (
            results.map((user) => (
              <button
                key={user._id}
                onClick={() => handleSelect(user.slug ?? user._id)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#22224a] transition-colors text-left border-b border-[#0f0f23] last:border-0"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold">
                      {user.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm truncate">
                      {user.username}
                    </span>
                    {user.discordUsername && user.discordUsername !== user.username.toLowerCase() && (
                      <span className="text-gray-500 text-xs">@{user.discordUsername}</span>
                    )}
                    {user.riotVerified && (
                      <ShieldCheck size={12} className="text-green-400 shrink-0" />
                    )}
                  </div>
                  {user.riotId && (
                    <p className="text-gray-400 text-xs truncate">{user.riotId}</p>
                  )}
                  {user.preferredRoles && user.preferredRoles.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {user.preferredRoles.slice(0, 2).map((role) => (
                        <span key={role} className="text-[10px] font-semibold bg-[#5865F2]/15 text-[#8b95f5] px-1.5 py-0.5 rounded">
                          {role}
                        </span>
                      ))}
                      {user.preferredRoles.length > 2 && (
                        <span className="text-[10px] text-gray-500 font-semibold">
                          +{user.preferredRoles.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
