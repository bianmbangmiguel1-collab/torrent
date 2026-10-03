// app/category/[slug]/loading.tsx
export default function CategoryLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex gap-2 mb-6">
          <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
        </div>

        <div className="h-56 sm:h-64 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl mb-10 animate-pulse" />

        <div className="flex gap-2 mb-10">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
            >
              <div className="aspect-square bg-gray-100 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}