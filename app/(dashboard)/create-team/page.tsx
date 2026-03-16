"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useModal } from "@/app/ModalProvider";

export default function CreateTeamPage() {
  const createTeam = useMutation(api.teams.create);
  const router = useRouter();
  const { alert } = useModal();

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return alert({ title: "Error", message: "Team name is required" });

    setCreating(true);
    try {
      await createTeam({ name: name.trim() });
      router.push("/teams");
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
    setCreating(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Team</h1>

      <label className="block text-gray-400 text-sm mb-2">Team Name</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Team Liquid"
        autoFocus
        className="w-full bg-[#1a1a3e] rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-8 outline-none focus:ring-2 focus:ring-[#5865F2]"
      />

      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full bg-[#5865F2] text-white py-4 rounded-lg text-lg font-bold hover:bg-[#4752C4] transition-colors disabled:opacity-60"
      >
        {creating ? "Creating..." : "Create Team"}
      </button>
    </div>
  );
}
