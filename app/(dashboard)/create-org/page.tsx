"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useModal } from "@/app/ModalProvider";

export default function CreateOrgPage() {
  const createOrg = useMutation(api.organizations.create);
  const router = useRouter();
  const { alert } = useModal();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return alert({ title: "Error", message: "Organization name is required" });

    setCreating(true);
    try {
      await createOrg({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      router.push("/my-tournaments");
    } catch (err: any) {
      alert({ title: "Error", message: err.message });
    }
    setCreating(false);
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create Organization</h1>

      <label className="block text-gray-400 text-sm mb-2">
        Organization Name
      </label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Grindset Esports"
        className="w-full bg-[#1a1a3e] rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-4 outline-none focus:ring-2 focus:ring-[#5865F2]"
      />

      <label className="block text-gray-400 text-sm mb-2">
        Description (optional)
      </label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What's your org about?"
        rows={3}
        className="w-full bg-[#1a1a3e] rounded-lg px-4 py-3 text-white placeholder-gray-500 mb-8 outline-none focus:ring-2 focus:ring-[#5865F2] resize-none"
      />

      <button
        onClick={handleCreate}
        disabled={creating}
        className="w-full bg-[#5865F2] text-white py-4 rounded-lg text-lg font-bold hover:bg-[#4752C4] transition-colors disabled:opacity-60"
      >
        {creating ? "Creating..." : "Create Organization"}
      </button>
    </div>
  );
}
