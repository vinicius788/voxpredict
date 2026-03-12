import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse rounded bg-[rgba(255,255,255,0.06)] ${className}`} />
);

export const MarketCardSkeleton: React.FC = () => (
  <div className="vp-card p-4">
    <Skeleton className="mb-3 h-4 w-24" />
    <Skeleton className="mb-2 h-6 w-full" />
    <Skeleton className="mb-4 h-6 w-3/4" />
    <Skeleton className="mb-2 h-2 w-full" />
    <Skeleton className="mb-4 h-2 w-full" />
    <Skeleton className="h-4 w-32" />
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="vp-card p-5">
    <Skeleton className="mb-3 h-3 w-24" />
    <Skeleton className="h-8 w-28" />
  </div>
);

