export type GameDirection =
  | 'down'
  | 'down_left'
  | 'left'
  | 'up_left'
  | 'up'
  | 'up_right'
  | 'right'
  | 'down_right'

export interface PlayerData {
  id: string
  name: string
  x: number
  y: number
  level: number
  hp: number
  maxHp: number
  direction: GameDirection
}

export interface JoinPayload {
  username: string
  name?: string
  x?: number
  y?: number
  level?: number
  hp?: number
  maxHp?: number
}

export interface CharacterSyncPayload {
  username: string
  name: string
  level: number
  hp: number
  maxHp: number
  exp: number
  maxExp: number
  baseAtk: number
  zeny: number
  x: number
  y: number
  inventory: InventorySlot[]
}

export interface PlayerMovePayload {
  x: number
  y: number
  direction: GameDirection
  isMoving: boolean
}

export interface PlayerMovedBroadcast {
  id: string
  x: number
  y: number
  direction: GameDirection
  isMoving: boolean
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  text: string
  timestamp: number
  type: 'global' | 'system'
}

export type MonsterType = 'poring' | 'wolf'

export interface ServerMonsterData {
  id: string
  type: MonsterType
  name: string
  x: number
  y: number
  hp: number
  maxHp: number
  isDead: boolean
  targetPlayerId?: string | null
}

export interface PlayerAttackPayload {
  targetMonsterId?: string | null
}

export interface CombatHitBroadcast {
  attackerId: string
  targetId: string
  targetType: 'monster' | 'player'
  damage: number
  isCritical: boolean
  remainingHp: number
  isDead: boolean
}

export interface PlayerRewardBroadcast {
  playerId: string
  expGained: number
  zenyGained: number
  monsterName: string
}

export type ItemType = 'jellopy' | 'apple' | 'wolf_claw' | 'red_potion'

export interface GroundItemData {
  id: string
  itemId: ItemType
  name: string
  x: number
  y: number
  quantity: number
  spawnTime: number
}

export interface PickupLootPayload {
  groundItemId: string
}

export interface LootPickedBroadcast {
  groundItemId: string
  pickerId: string
  pickerName: string
  item: GroundItemData
}

export interface InventorySlot {
  itemId: ItemType
  name: string
  quantity: number
  icon: string
  description: string
  healAmount?: number
}
