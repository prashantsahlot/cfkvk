import { Home, Search, Library, PlusSquare, Heart } from "lucide-react"
import Link from "next/link"

export default function Sidebar() {
  return (
    <div className="w-64 bg-black p-6 hidden md:block">
      <nav className="space-y-6">
        <div className="space-y-3">
          <Link href="/" className="flex items-center space-x-3 text-gray-300 hover:text-white">
            <Home />
            <span>Home</span>
          </Link>
          <Link href="/search" className="flex items-center space-x-3 text-gray-300 hover:text-white">
            <Search />
            <span>Search</span>
          </Link>
          <Link href="/library" className="flex items-center space-x-3 text-gray-300 hover:text-white">
            <Library />
            <span>Your Library</span>
          </Link>
        </div>
        <div className="space-y-3">
          <Link href="/create-playlist" className="flex items-center space-x-3 text-gray-300 hover:text-white">
            <PlusSquare />
            <span>Create Playlist</span>
          </Link>
          <Link href="/liked-songs" className="flex items-center space-x-3 text-gray-300 hover:text-white">
            <Heart />
            <span>Liked Songs</span>
          </Link>
        </div>
      </nav>
      <div className="mt-6 pt-6 border-t border-gray-800 text-xs text-gray-400">
        <p>Legal</p>
        <p>Privacy Center</p>
        <p>Privacy Policy</p>
        <p>Cookies</p>
        <p>About Ads</p>
      </div>
    </div>
  )
}
