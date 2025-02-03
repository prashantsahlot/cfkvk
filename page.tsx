import Sidebar from "./components/Sidebar"
import MainContent from "./components/MainContent"
import Player from "./components/Player"

export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-black text-white">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <MainContent />
      </div>
      <Player />
    </div>
  )
}

