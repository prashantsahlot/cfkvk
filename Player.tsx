"use client"

import { useState } from "react"
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2 } from "lucide-react"

export default function Player() {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="bg-black bg-opacity-95 text-white p-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <img src="/placeholder.svg?height=60&width=60" alt="Album cover" className="w-16 h-16 rounded-md" />
        <div>
          <h3 className="font-semibold">Song Title</h3>
          <p className="text-sm text-gray-400">Artist Name</p>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <div className="flex items-center space-x-6">
          <Shuffle className="text-gray-400 hover:text-white cursor-pointer" />
          <SkipBack className="text-gray-400 hover:text-white cursor-pointer" />
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="bg-white text-black rounded-full p-2 hover:scale-105 transition"
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
          <SkipForward className="text-gray-400 hover:text-white cursor-pointer" />
          <Repeat className="text-gray-400 hover:text-white cursor-pointer" />
        </div>
        <div className="w-full max-w-md mt-2 bg-gray-600 rounded-full h-1">
          <div className="bg-white h-1 rounded-full w-1/3"></div>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <Volume2 className="text-gray-400" />
        <div className="w-24 bg-gray-600 rounded-full h-1">
          <div className="bg-white h-1 rounded-full w-2/3"></div>
        </div>
      </div>
    </div>
  )
}
