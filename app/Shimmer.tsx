"use client";

export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg shimmer ${className}`}
    />
  );
}

export function ShimmerText({ className = "" }: { className?: string }) {
  return <Shimmer className={`h-4 ${className}`} />;
}

export function ShimmerCard() {
  return (
    <div className="bg-[#1a1a3e] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Shimmer className="h-5 w-40" />
        <Shimmer className="h-5 w-16" />
      </div>
      <Shimmer className="h-4 w-24" />
      <div className="flex gap-3">
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-12" />
      </div>
    </div>
  );
}

export function ShimmerList({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerCard key={i} />
      ))}
    </div>
  );
}

export function ShimmerProfile() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="flex flex-col items-center mb-8">
        <Shimmer className="w-20 h-20 rounded-full mb-3" />
        <Shimmer className="h-7 w-36" />
      </div>
      <div className="mb-6">
        <Shimmer className="h-3 w-24 mb-3" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-10 w-20" />
          ))}
        </div>
      </div>
      <div className="mb-6">
        <Shimmer className="h-3 w-16 mb-3" />
        <Shimmer className="h-28 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function ShimmerTeamDetail() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <Shimmer className="h-8 w-48 mb-2" />
        <Shimmer className="h-4 w-32" />
      </div>
      <div className="mb-6">
        <Shimmer className="h-5 w-28 mb-3" />
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ShimmerTournamentDetail() {
  return (
    <div>
      <div className="mb-6">
        <Shimmer className="h-9 w-64 mb-2" />
        <Shimmer className="h-4 w-32 mb-3" />
        <div className="flex gap-3">
          <Shimmer className="h-6 w-20" />
          <Shimmer className="h-6 w-36" />
        </div>
      </div>
      <div className="flex gap-6">
        <div className="flex-1 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
        <div className="w-80 hidden lg:block space-y-3">
          <Shimmer className="h-3 w-24 mb-2" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
