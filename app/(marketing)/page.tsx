"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Trophy, Users, Swords, Shield, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Build Your Team",
    description:
      "Create a team, invite players, assign roles — Top, Jungle, Mid, Bot, Support. Manage your roster with starters and subs.",
  },
  {
    icon: Trophy,
    title: "Compete in Tournaments",
    description:
      "Apply to tournaments as a team. Organizers review and approve. Single-elimination brackets generated automatically.",
  },
  {
    icon: Swords,
    title: "Track Your Games",
    description:
      "Link your Riot ID and see your match history, champion mastery, and KDA stats — all verified through Discord.",
  },
  {
    icon: Shield,
    title: "Verified Players",
    description:
      "Riot ID verification through Discord connections ensures players are who they say they are. No smurfs, no fakes.",
  },
];

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/my-tournaments");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || isSignedIn) return null;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span
            className="text-xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] to-[#8b95f5]"
            style={{ fontFamily: "var(--font-logo)" }}
          >
            QUEUE UP
          </span>
          <Link
            href="/sign-in"
            className="px-5 py-2 rounded-lg bg-[#5865F2] text-white text-sm font-semibold hover:bg-[#4752C4] transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1
            className="text-4xl sm:text-6xl md:text-7xl tracking-wide mb-6 text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] to-[#8b95f5]"
            style={{ fontFamily: "var(--font-logo)" }}
          >
            QUEUE UP
          </h1>
          <p className="text-xl sm:text-2xl text-gray-300 mb-4 font-medium">
            Tournament brackets, simplified.
          </p>
          <p className="text-gray-500 text-lg max-w-xl mx-auto mb-10">
            Build your team. Join tournaments. Compete in brackets. Track your
            stats. All in one place.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/sign-in"
              className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#5865F2] text-white font-semibold text-lg hover:bg-[#4752C4] transition-colors"
            >
              Get Started
              <ArrowRight size={18} />
            </Link>
          </div>
          <p className="text-gray-600 text-sm mt-4">
            Sign in with Discord — it takes 10 seconds
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-[#1a1a3e]/50 border border-white/5 rounded-2xl p-6 hover:bg-[#1a1a3e] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[#5865F2]/10 flex items-center justify-center mb-4">
                  <feature.icon size={20} className="text-[#5865F2]" />
                </div>
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-10">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Sign in with Discord",
                desc: "Connect your Discord account and link your Riot ID for verification.",
              },
              {
                step: "2",
                title: "Build or join a team",
                desc: "Create your team, invite players, and assign roles for your roster.",
              },
              {
                step: "3",
                title: "Enter tournaments",
                desc: "Apply to open tournaments. Once approved, compete in auto-generated brackets.",
              },
            ].map((item) => (
              <div key={item.step}>
                <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center mx-auto mb-4">
                  <span className="font-bold">{item.step}</span>
                </div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-r from-[#5865F2]/10 to-[#8b95f5]/10 border border-[#5865F2]/20 rounded-2xl p-10">
            <h2 className="text-2xl font-bold mb-3">Ready to compete?</h2>
            <p className="text-gray-400 mb-6">
              Join teams, enter tournaments, and climb the ranks.
            </p>
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#5865F2] text-white font-semibold text-lg hover:bg-[#4752C4] transition-colors"
            >
              Sign in with Discord
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <span
              className="text-sm tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-[#5865F2] to-[#8b95f5]"
              style={{ fontFamily: "var(--font-logo)" }}
            >
              QUEUE UP
            </span>
            <p className="text-gray-600 text-xs">
              © {new Date().getFullYear()} Queue Up. Play to win.
            </p>
          </div>
          <p className="text-gray-600 text-[10px] leading-relaxed">
            QueueUP isn't endorsed by Riot Games and doesn't reflect the views
            or opinions of Riot Games or anyone officially involved in producing
            or managing Riot Games properties. Riot Games, and all associated
            properties are trademarks or registered trademarks of Riot Games,
            Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
