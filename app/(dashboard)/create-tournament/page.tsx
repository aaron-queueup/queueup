"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useModal } from "@/app/ModalProvider";

const CAPACITY_OPTIONS = [4, 8, 16, 32];
const TEAM_SIZE_OPTIONS = [2, 3, 5];

export default function CreateTournamentPage() {
  const createTournament = useMutation(api.tournaments.create);
  const myOrgs = useQuery(api.organizations.myOrgs, {});
  const router = useRouter();

  const [name, setName] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<Id<"organizations"> | null>(
    null
  );
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState(8);
  const [teamSize, setTeamSize] = useState(5);
  const [creating, setCreating] = useState(false);

  const { alert } = useModal();

  const handleCreate = async () => {
    if (!name.trim()) return alert({ title: "Error", message: "Tournament name is required" });
    if (!selectedOrg) return alert({ title: "Error", message: "Select an organization" });

    setCreating(true);
    try {
      await createTournament({
        name: name.trim(),
        orgId: selectedOrg,
        description: description.trim() || undefined,
        capacity,
        teamSize,
      });
      router.push("/");
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
    setCreating(false);
  };

  if (myOrgs && myOrgs.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center mt-12">
        <h2 className="text-xl font-bold mb-2">No Organization</h2>
        <p className="text-gray-400 mb-6">
          You need to create an organization before you can create tournaments.
        </p>
        <Link
          href="/create-org"
          className="inline-block px-6 py-3 rounded-lg bg-[#5865F2] text-white font-semibold hover:bg-[#4752C4] transition-colors"
        >
          Create Organization
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Tournament</h1>

      <label className="block text-gray-400 text-sm mb-2">Organization</label>
      <div className="grid gap-2 mb-4">
        {myOrgs?.map((org) => (
          <button
            key={org._id}
            onClick={() => setSelectedOrg(org._id!)}
            className={`text-left p-3 rounded-lg flex items-center justify-between transition-colors ${
              selectedOrg === org._id
                ? "bg-[#5865F2] text-white"
                : "bg-[#1a1a3e] text-gray-400 hover:bg-[#22224a]"
            }`}
          >
            <span className="font-semibold">{org.name}</span>
            <span className="text-xs uppercase">{org.role}</span>
          </button>
        ))}
      </div>

      <label className="block text-gray-400 text-sm mb-2">
        Tournament Name
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Spring Showdown 2026"
        className="w-full bg-[#1a1a3e] rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-4 outline-none focus:ring-2 focus:ring-[#5865F2]"
      />

      <label className="block text-gray-400 text-sm mb-2">
        Description (optional)
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Tournament details..."
        rows={3}
        className="w-full bg-[#1a1a3e] rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-4 outline-none focus:ring-2 focus:ring-[#5865F2] resize-none"
      />

      <label className="block text-gray-400 text-sm mb-2">Team Size</label>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {TEAM_SIZE_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setTeamSize(opt)}
            className={`py-3 rounded-lg font-semibold transition-colors ${
              teamSize === opt
                ? "bg-[#5865F2] text-white"
                : "bg-[#1a1a3e] text-gray-400 hover:bg-[#22224a]"
            }`}
          >
            {opt}v{opt}
          </button>
        ))}
      </div>

      <label className="block text-gray-400 text-sm mb-2">Max Teams</label>
      <div className="grid grid-cols-4 gap-2 mb-8">
        {CAPACITY_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setCapacity(opt)}
            className={`py-3 rounded-lg font-semibold transition-colors ${
              capacity === opt
                ? "bg-[#5865F2] text-white"
                : "bg-[#1a1a3e] text-gray-400 hover:bg-[#22224a]"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full bg-[#5865F2] text-white py-4 rounded-lg text-lg font-bold hover:bg-[#4752C4] transition-colors disabled:opacity-60"
      >
        {creating ? "Creating..." : "Create Tournament"}
      </button>
    </div>
  );
}
