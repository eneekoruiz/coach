export default function LoadingHistory() {
  return (
    <div className="flex-1 overflow-y-auto pb-24 md:pb-8 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(233,238,244,0.95)_38%,_rgba(212,220,230,0.96)_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        
        {/* Header Skeleton */}
        <header className="rounded-[2rem] border border-white/80 bg-white/75 px-5 py-5 shadow-sm backdrop-blur-2xl sm:px-6 h-32 animate-pulse flex items-center">
          <div className="w-1/3 h-8 bg-slate-200 rounded-full"></div>
        </header>

        {/* Pills Selector Skeleton */}
        <div className="flex justify-center mt-4">
          <div className="w-64 h-12 bg-slate-200/70 rounded-full animate-pulse"></div>
        </div>

        {/* Bento Grid Insights Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 rounded-3xl border border-slate-100 bg-white/50 h-28 animate-pulse flex flex-col justify-center gap-3">
              <div className="w-24 h-4 bg-slate-200 rounded-full"></div>
              <div className="w-32 h-6 bg-slate-200 rounded-full"></div>
            </div>
          ))}
        </div>

        {/* Big Chart Skeleton */}
        <div className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2.5rem] p-6 h-80 animate-pulse flex flex-col gap-4 mt-2">
          <div className="w-48 h-6 bg-slate-200 rounded-full"></div>
          <div className="w-full flex-1 bg-slate-100 rounded-xl"></div>
        </div>

        {/* Small Charts Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white/60 backdrop-blur-2xl border border-white/80 rounded-[2.5rem] p-6 h-64 animate-pulse flex flex-col gap-4">
              <div className="w-32 h-6 bg-slate-200 rounded-full"></div>
              <div className="w-full flex-1 bg-slate-100 rounded-xl"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
