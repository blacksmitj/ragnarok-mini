import React, { useRef, useEffect, useState, useCallback } from 'react'
import {
  Layers,
  Save,
  Globe,
  Eraser,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  TreePine,
  Flower2,
  Grid,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export type PaletteTool =
  | 'floor_grass'
  | 'floor_dirt'
  | 'floor_stone'
  | 'terrain_cliff'
  | 'terrain_water'
  | 'bush'
  | 'tree'
  | 'spawner_poring'
  | 'spawner_wolf'
  | 'spawner_mvp'
  | 'eraser'

interface MapData {
  id?: string
  name: string
  width: number
  height: number
  tileSize: number
  layers: {
    floor: number[][] // 0: none, 1: grass, 2: dirt, 3: stone
    terrain: number[][] // 0: none, 1: cliff, 2: water (impassable)
    doodads: Array<{ x: number; y: number; type: 'bush' | 'tree' }>
    spawners: Array<{ x: number; y: number; monsterType: string }>
  }
}

interface MapCanvasEditorProps {
  initialMap?: MapData
  onSaveDraft: (data: MapData) => void
  onPublish: (data: MapData) => void
  isSaving?: boolean
}

export const MapCanvasEditor: React.FC<MapCanvasEditorProps> = ({
  initialMap,
  onSaveDraft,
  onPublish,
  isSaving = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Map Configurations
  const [mapName, setMapName] = useState(initialMap?.name || 'Prontera Training Field')
  const [mapWidth] = useState(initialMap?.width || 40) // 40 tiles
  const [mapHeight] = useState(initialMap?.height || 30) // 30 tiles
  const tileSize = 32

  // Layer Visibility
  const [showGrid, setShowGrid] = useState(true)
  const [showFloor, setShowFloor] = useState(true)
  const [showTerrain, setShowTerrain] = useState(true)
  const [showDoodads, setShowDoodads] = useState(true)
  const [showSpawners, setShowSpawners] = useState(true)

  // Zoom & Tool
  const [zoom, setZoom] = useState(1)
  const [selectedTool, setSelectedTool] = useState<PaletteTool>('floor_grass')
  const [isDrawing, setIsDrawing] = useState(false)

  // Map Data State (2D Matrix)
  const [mapLayers, setMapLayers] = useState<MapData['layers']>(() => {
    if (initialMap?.layers) return initialMap.layers

    // Inisialisasi default floor rumput (1)
    const floor = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(1))
    const terrain = Array.from({ length: mapHeight }, () => Array(mapWidth).fill(0))
    return {
      floor,
      terrain,
      doodads: [
        { x: 5, y: 5, type: 'tree' },
        { x: 8, y: 7, type: 'bush' },
      ],
      spawners: [
        { x: 10, y: 10, monsterType: 'poring' },
        { x: 20, y: 15, monsterType: 'wolf' },
      ],
    }
  })

  // Palet Warna & Visual Token untuk Render Canvas 2D
  const paletteColors = {
    floor_grass: '#15803d', // Hijau rumput
    floor_dirt: '#a16207', // Cokelat tanah
    floor_stone: '#64748b', // Abu-abu batu
    terrain_cliff: '#475569', // Tebing batu
    terrain_water: '#0284c7', // Biru air
    bush: '#22c55e', // Hijau semak
    tree: '#166534', // Hijau tua pohon
    spawner_poring: '#f43f5e', // Merah muda poring
    spawner_wolf: '#ea580c', // Oranye serigala
    spawner_mvp: '#eab308', // Emas MVP
  }

  // Draw Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = false

    // 1. Render Layer 1: Floor
    if (showFloor) {
      for (let r = 0; r < mapHeight; r++) {
        for (let c = 0; c < mapWidth; c++) {
          const tile = mapLayers.floor[r]?.[c]
          if (tile === 1) ctx.fillStyle = paletteColors.floor_grass
          else if (tile === 2) ctx.fillStyle = paletteColors.floor_dirt
          else if (tile === 3) ctx.fillStyle = paletteColors.floor_stone
          else ctx.fillStyle = '#0f172a'

          ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize)
        }
      }
    }

    // 2. Render Layer 2: Terrain / Impassable
    if (showTerrain) {
      for (let r = 0; r < mapHeight; r++) {
        for (let c = 0; c < mapWidth; c++) {
          const tTile = mapLayers.terrain[r]?.[c]
          if (tTile === 1) {
            ctx.fillStyle = paletteColors.terrain_cliff
            ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize)
            // Hatching indicator for cliff
            ctx.strokeStyle = '#334155'
            ctx.strokeRect(c * tileSize + 2, r * tileSize + 2, tileSize - 4, tileSize - 4)
          } else if (tTile === 2) {
            ctx.fillStyle = paletteColors.terrain_water
            ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize)
          }
        }
      }
    }

    // 3. Render Layer 3: Doodads (Trees, Bushes)
    if (showDoodads) {
      mapLayers.doodads.forEach((d) => {
        const cx = d.x * tileSize + tileSize / 2
        const cy = d.y * tileSize + tileSize / 2

        if (d.type === 'tree') {
          // Tree circle
          ctx.beginPath()
          ctx.fillStyle = paletteColors.tree
          ctx.arc(cx, cy, tileSize * 0.7, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#14532d'
          ctx.beginPath()
          ctx.arc(cx, cy, tileSize * 0.4, 0, Math.PI * 2)
          ctx.fill()
        } else if (d.type === 'bush') {
          // Bush rounded
          ctx.beginPath()
          ctx.fillStyle = paletteColors.bush
          ctx.arc(cx, cy, tileSize * 0.45, 0, Math.PI * 2)
          ctx.fill()
        }
      })
    }

    // 4. Render Layer 4: Monster Spawners
    if (showSpawners) {
      mapLayers.spawners.forEach((s) => {
        const x = s.x * tileSize
        const y = s.y * tileSize
        ctx.fillStyle =
          s.monsterType === 'mvp'
            ? paletteColors.spawner_mvp
            : s.monsterType === 'wolf'
            ? paletteColors.spawner_wolf
            : paletteColors.spawner_poring

        ctx.fillRect(x + 4, y + 4, tileSize - 8, tileSize - 8)
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.5
        ctx.strokeRect(x + 4, y + 4, tileSize - 8, tileSize - 8)

        // Text indicator
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 9px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(s.monsterType[0].toUpperCase(), x + tileSize / 2, y + tileSize / 2 + 3)
      })
    }

    // 5. Grid Lines Overlay
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
      ctx.lineWidth = 1
      for (let c = 0; c <= mapWidth; c++) {
        ctx.beginPath()
        ctx.moveTo(c * tileSize, 0)
        ctx.lineTo(c * tileSize, mapHeight * tileSize)
        ctx.stroke()
      }
      for (let r = 0; r <= mapHeight; r++) {
        ctx.beginPath()
        ctx.moveTo(0, r * tileSize)
        ctx.lineTo(mapWidth * tileSize, r * tileSize)
        ctx.stroke()
      }
    }
  }, [mapLayers, mapWidth, mapHeight, tileSize, showGrid, showFloor, showTerrain, showDoodads, showSpawners])

  useEffect(() => {
    renderCanvas()
  }, [renderCanvas])

  // Handle Paint On Canvas
  const handlePaint = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleFactor = canvas.width / rect.width

    const x = (clientX - rect.left) * scaleFactor
    const y = (clientY - rect.top) * scaleFactor

    const tileX = Math.floor(x / tileSize)
    const tileY = Math.floor(y / tileSize)

    if (tileX < 0 || tileX >= mapWidth || tileY < 0 || tileY >= mapHeight) return

    setMapLayers((prev) => {
      const newFloor = prev.floor.map((row) => [...row])
      const newTerrain = prev.terrain.map((row) => [...row])
      let newDoodads = [...prev.doodads]
      let newSpawners = [...prev.spawners]

      if (selectedTool === 'floor_grass') newFloor[tileY][tileX] = 1
      else if (selectedTool === 'floor_dirt') newFloor[tileY][tileX] = 2
      else if (selectedTool === 'floor_stone') newFloor[tileY][tileX] = 3
      else if (selectedTool === 'terrain_cliff') newTerrain[tileY][tileX] = 1
      else if (selectedTool === 'terrain_water') newTerrain[tileY][tileX] = 2
      else if (selectedTool === 'tree') {
        newDoodads = newDoodads.filter((d) => !(d.x === tileX && d.y === tileY))
        newDoodads.push({ x: tileX, y: tileY, type: 'tree' })
      } else if (selectedTool === 'bush') {
        newDoodads = newDoodads.filter((d) => !(d.x === tileX && d.y === tileY))
        newDoodads.push({ x: tileX, y: tileY, type: 'bush' })
      } else if (selectedTool === 'spawner_poring') {
        newSpawners = newSpawners.filter((s) => !(s.x === tileX && s.y === tileY))
        newSpawners.push({ x: tileX, y: tileY, monsterType: 'poring' })
      } else if (selectedTool === 'spawner_wolf') {
        newSpawners = newSpawners.filter((s) => !(s.x === tileX && s.y === tileY))
        newSpawners.push({ x: tileX, y: tileY, monsterType: 'wolf' })
      } else if (selectedTool === 'spawner_mvp') {
        newSpawners = newSpawners.filter((s) => !(s.x === tileX && s.y === tileY))
        newSpawners.push({ x: tileX, y: tileY, monsterType: 'mvp' })
      } else if (selectedTool === 'eraser') {
        newTerrain[tileY][tileX] = 0
        newDoodads = newDoodads.filter((d) => !(d.x === tileX && d.y === tileY))
        newSpawners = newSpawners.filter((s) => !(s.x === tileX && s.y === tileY))
      }

      return {
        floor: newFloor,
        terrain: newTerrain,
        doodads: newDoodads,
        spawners: newSpawners,
      }
    })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    handlePaint(e.clientX, e.clientY)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    handlePaint(e.clientX, e.clientY)
  }

  const handleMouseUp = () => {
    setIsDrawing(false)
  }

  const getPayload = (): MapData => ({
    name: mapName,
    width: mapWidth,
    height: mapHeight,
    tileSize,
    layers: mapLayers,
  })

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl shadow">
        <div className="flex items-center gap-3">
          <Input
            value={mapName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMapName(e.target.value)}
            className="w-64 font-semibold text-white bg-slate-950 border-slate-700 h-9"
            placeholder="Nama Map Arena"
          />
          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
            {mapWidth}x{mapHeight} Tiles ({mapWidth * tileSize}x{mapHeight * tileSize}px)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs font-mono px-2 text-slate-300">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
              className="p-1.5 text-slate-400 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <Button
            onClick={() => onSaveDraft(getPayload())}
            disabled={isSaving}
            variant="outline"
            className="flex items-center gap-1.5 text-xs h-9 cursor-pointer border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            <Save className="h-4 w-4 text-sky-400" />
            Save Draft
          </Button>

          <Button
            onClick={() => onPublish(getPayload())}
            disabled={isSaving}
            className="flex items-center gap-1.5 text-xs h-9 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
          >
            <Globe className="h-4 w-4" />
            Publish Map
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4 flex-1 overflow-hidden min-h-[600px]">
        {/* Left Palette & Layers (Col 3) */}
        <div className="col-span-3 space-y-4 overflow-y-auto pr-1">
          {/* Palette Tools */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Grid className="h-4 w-4 text-indigo-400" /> Painting Palette
            </div>

            {/* Group Floor */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-400">1. Floor Tiles</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'floor_grass', label: 'Grass', color: 'bg-green-700' },
                  { id: 'floor_dirt', label: 'Dirt', color: 'bg-yellow-700' },
                  { id: 'floor_stone', label: 'Stone', color: 'bg-slate-500' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedTool(item.id as PaletteTool)}
                    className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium border transition-all cursor-pointer ${
                      selectedTool === item.id
                        ? 'border-indigo-500 bg-indigo-950/60 text-white font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${item.color}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Group Terrain Collision */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-400">2. Terrain / Impassable</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'terrain_cliff', label: 'Cliff (Tebing)', color: 'bg-slate-600' },
                  { id: 'terrain_water', label: 'Water (Air)', color: 'bg-sky-600' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedTool(item.id as PaletteTool)}
                    className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium border transition-all cursor-pointer ${
                      selectedTool === item.id
                        ? 'border-indigo-500 bg-indigo-950/60 text-white font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className={`h-3 w-3 rounded-full ${item.color}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Group Doodads (Trees, Bushes) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-400">3. Objects & Doodads</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setSelectedTool('tree')}
                  className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium border transition-all cursor-pointer ${
                    selectedTool === 'tree'
                      ? 'border-indigo-500 bg-indigo-950/60 text-white font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <TreePine className="h-4 w-4 text-emerald-500" /> Tree (Pohon)
                </button>
                <button
                  onClick={() => setSelectedTool('bush')}
                  className={`flex items-center gap-1.5 p-2 rounded text-xs font-medium border transition-all cursor-pointer ${
                    selectedTool === 'bush'
                      ? 'border-indigo-500 bg-indigo-950/60 text-white font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  <Flower2 className="h-4 w-4 text-green-400" /> Bush (Semak)
                </button>
              </div>
            </div>

            {/* Group Monster Spawners */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-slate-400">4. Monster Spawners</span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setSelectedTool('spawner_poring')}
                  className={`flex items-center justify-center p-2 rounded text-xs font-medium border transition-all cursor-pointer ${
                    selectedTool === 'spawner_poring'
                      ? 'border-rose-500 bg-rose-950/60 text-rose-300 font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  Poring
                </button>
                <button
                  onClick={() => setSelectedTool('spawner_wolf')}
                  className={`flex items-center justify-center p-2 rounded text-xs font-medium border transition-all cursor-pointer ${
                    selectedTool === 'spawner_wolf'
                      ? 'border-orange-500 bg-orange-950/60 text-orange-300 font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  Wolf
                </button>
                <button
                  onClick={() => setSelectedTool('spawner_mvp')}
                  className={`flex items-center justify-center p-2 rounded text-xs font-medium border transition-all cursor-pointer ${
                    selectedTool === 'spawner_mvp'
                      ? 'border-amber-500 bg-amber-950/60 text-amber-300 font-bold'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                  }`}
                >
                  MVP Boss
                </button>
              </div>
            </div>

            {/* Tool Eraser */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedTool('eraser')}
                className={`w-full flex items-center justify-center gap-2 p-2 rounded text-xs font-medium border transition-all cursor-pointer ${
                  selectedTool === 'eraser'
                    ? 'border-red-500 bg-red-950/60 text-red-300 font-bold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                <Eraser className="h-4 w-4" /> Eraser (Hapus Object / Terrain)
              </button>
            </div>
          </div>

          {/* Layer Visibility Toggles */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <Layers className="h-4 w-4 text-emerald-400" /> Layer Visibility
            </div>

            {[
              { label: 'Grid Lines', state: showGrid, set: setShowGrid },
              { label: 'Layer 1: Floor', state: showFloor, set: setShowFloor },
              { label: 'Layer 2: Terrain', state: showTerrain, set: setShowTerrain },
              { label: 'Layer 3: Doodads', state: showDoodads, set: setShowDoodads },
              { label: 'Layer 4: Spawners', state: showSpawners, set: setShowSpawners },
            ].map((layer) => (
              <div key={layer.label} className="flex items-center justify-between text-xs text-slate-300 py-1">
                <span>{layer.label}</span>
                <button
                  onClick={() => layer.set(!layer.state)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  {layer.state ? <Eye className="h-4 w-4 text-emerald-400" /> : <EyeOff className="h-4 w-4 text-slate-600" />}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Canvas Viewport (Col 9) */}
        <div className="col-span-9 rounded-xl border border-slate-800 bg-slate-950 p-4 overflow-auto flex items-center justify-center shadow-inner relative">
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.1s ease-out',
            }}
            className="border-2 border-slate-700 shadow-2xl rounded overflow-hidden"
          >
            <canvas
              ref={canvasRef}
              width={mapWidth * tileSize}
              height={mapHeight * tileSize}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="cursor-crosshair block"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
