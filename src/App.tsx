import React from 'react'
import { GameLayout } from './components/GameLayout'

/**
 * Root Component aplikasi Mini Ragnarok.
 * Merender GameLayout yang menyatukan domain Phaser 3/4 Canvas dan React RPG HUD.
 */
export const App: React.FC = () => {
  return <GameLayout />
}

export default App
