export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label="Lädt…">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-200 border-t-amber-500" />
    </div>
  )
}
