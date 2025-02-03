import Image from "next/image"

const playlists = [
  { id: 1, name: "Discover Weekly", imageUrl: "/placeholder.svg?height=150&width=150" },
  { id: 2, name: "Release Radar", imageUrl: "/placeholder.svg?height=150&width=150" },
  { id: 3, name: "Daily Mix 1", imageUrl: "/placeholder.svg?height=150&width=150" },
  { id: 4, name: "Daily Mix 2", imageUrl: "/placeholder.svg?height=150&width=150" },
  { id: 5, name: "Daily Mix 3", imageUrl: "/placeholder.svg?height=150&width=150" },
  { id: 6, name: "Daily Mix 4", imageUrl: "/placeholder.svg?height=150&width=150" },
]

export default function MainContent() {
  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-900 to-black p-8">
      <h1 className="text-3xl font-bold mb-6">Good afternoon</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {playlists.map((playlist) => (
          <div
            key={playlist.id}
            className="bg-white bg-opacity-10 rounded-lg p-4 hover:bg-opacity-20 transition duration-300"
          >
            <Image
              src={playlist.imageUrl || "/placeholder.svg"}
              alt={playlist.name}
              width={150}
              height={150}
              className="rounded-md mb-4"
            />
            <h3 className="font-semibold">{playlist.name}</h3>
          </div>
        ))}
      </div>
    </main>
  )
}

