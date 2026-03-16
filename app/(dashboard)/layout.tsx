"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useClerk } from "@clerk/nextjs";
import {
  Trophy,
  LayoutDashboard,
  Users,
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { ClientOnly } from "@/app/ClientOnly";
import { UserSearch } from "@/app/UserSearch";
import { useModal } from "@/app/ModalProvider";

const tabs = [
  { href: "/my-tournaments", label: "Dashboard" },
  { href: "/", label: "Tournaments" },
  { href: "/teams", label: "Teams" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const storeUser = useMutation(api.users.store);
  const currentUser = useQuery(api.users.current, {});
  const { confirm } = useModal();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isSignedIn) {
      storeUser();
    }
  }, [isSignedIn]);

  // Close menu on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    const ok = await confirm({ title: "Sign out?", confirmLabel: "Sign Out", variant: "danger" });
    if (!ok) return;
    await signOut();
    router.push("/sign-in");
  };

  return (
    <ClientOnly>
      <div className="min-h-screen flex flex-col">
        {/* Top nav */}
        <nav className="bg-[#0f0f23] border-b border-[#1a1a3e] px-6 py-3">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <Link href="/" className="shrink-0 text-xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] to-[#8b95f5]" style={{ fontFamily: "var(--font-logo)" }}>
              QUEUE UP
            </Link>
            <div className="flex gap-6 ml-auto">
              {tabs.map((tab) => {
                const isActive =
                  tab.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(tab.href);
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`relative py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "text-white"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {tab.label}
                    {isActive && (
                      <span className="absolute -bottom-3 left-0 right-0 h-0.5 bg-[#5865F2] rounded-full" />
                    )}
                  </Link>
                );
              })}
            </div>
            <div className="ml-4">
              <UserSearch />
            </div>

            {/* Profile avatar dropdown */}
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.username}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#5865F2] flex items-center justify-center">
                    <span className="text-xs font-bold">
                      {currentUser?.username?.charAt(0).toUpperCase() ?? "?"}
                    </span>
                  </div>
                )}
                <ChevronDown size={12} className={`text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a3e] rounded-xl border border-white/5 shadow-2xl overflow-hidden z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-[#0f0f23]">
                    <p className="font-semibold text-sm">{currentUser?.username}</p>
                    {currentUser?.discordUsername && currentUser.discordUsername !== currentUser.username?.toLowerCase() && (
                      <p className="text-gray-500 text-xs">@{currentUser.discordUsername}</p>
                    )}
                  </div>

                  {/* Links */}
                  <div className="py-1">
                    <Link
                      href={`/user/${currentUser?.slug ?? ""}`}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-300 hover:bg-[#22224a] hover:text-white transition-colors"
                    >
                      <User size={14} />
                      My Profile
                    </Link>
                  </div>

                  {/* Danger zone */}
                  <div className="border-t border-[#0f0f23] py-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 max-w-6xl mx-auto w-full p-6">{children}</main>
      </div>
    </ClientOnly>
  );
}
