interface Props {
  className?: string;
}

export function SkeletonBlock({ className = '' }: Props) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <SkeletonBlock className="h-10 w-10 rounded-lg shrink-0" />
          {Array.from({ length: cols - 1 }).map((_, j) => (
            <SkeletonBlock
              key={j}
              className={`h-4 rounded ${j === 0 ? 'flex-1' : 'w-20'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-5 shadow-card">
          <SkeletonBlock className="h-4 w-24 mb-3" />
          <SkeletonBlock className="h-8 w-16 mb-2" />
          <SkeletonBlock className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
