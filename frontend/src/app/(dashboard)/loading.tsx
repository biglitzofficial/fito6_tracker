export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-10 w-48 rounded-xl bg-secondary/50" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-2xl h-32 bg-secondary/30" />
        ))}
      </div>
      <div className="glass rounded-2xl h-64 bg-secondary/30" />
    </div>
  );
}
