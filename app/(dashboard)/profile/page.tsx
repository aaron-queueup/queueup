"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ShimmerProfile } from "@/app/Shimmer";

export default function ProfilePage() {
  const user = useQuery(api.users.current, {});
  const router = useRouter();

  useEffect(() => {
    if (user?.slug) {
      router.replace(`/user/${user.slug}`);
    }
  }, [user?.slug]);

  return null;
}
