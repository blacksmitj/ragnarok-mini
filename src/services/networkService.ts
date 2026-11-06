import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/useGameStore';
import type {
  PlayerData,
  JoinPayload,
  PlayerMovePayload,
  PlayerMovedBroadcast,
  ChatMessage,
  ServerMonsterData,
  PlayerAttackPayload,
  CombatHitBroadcast,
  PlayerRewardBroadcast,
  GroundItemData,
  PickupLootPayload,
  LootPickedBroadcast,
  CharacterSyncPayload
} from '../types/network';

const SERVER_URL = 'http://localhost:3001';

type CharacterLoadedCallback = (char: CharacterSyncPayload) => void;
type PlayerJoinedCallback = (player: PlayerData) => void;
type CurrentPlayersCallback = (players: PlayerData[]) => void;
type PlayerLeftCallback = (id: string) => void;
type PlayerMovedCallback = (data: PlayerMovedBroadcast) => void;
type ChatMessageCallback = (msg: ChatMessage) => void;
type MonstersUpdateCallback = (monsters: ServerMonsterData[]) => void;
type CombatHitCallback = (data: CombatHitBroadcast) => void;
type PlayerRewardCallback = (reward: PlayerRewardBroadcast) => void;
type GroundLootSpawnCallback = (loot: GroundItemData) => void;
type GroundLootCurrentCallback = (items: GroundItemData[]) => void;
type GroundLootPickedCallback = (data: LootPickedBroadcast) => void;

class NetworkService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  private onPlayerJoinedHandlers: Set<PlayerJoinedCallback> = new Set();
  private onCurrentPlayersHandlers: Set<CurrentPlayersCallback> = new Set();
  private onPlayerLeftHandlers: Set<PlayerLeftCallback> = new Set();
  private onPlayerMovedHandlers: Set<PlayerMovedCallback> = new Set();
  private onChatMessageHandlers: Set<ChatMessageCallback> = new Set();
  private onMonstersUpdateHandlers: Set<MonstersUpdateCallback> = new Set();
  private onCombatHitHandlers: Set<CombatHitCallback> = new Set();
  private onPlayerRewardHandlers: Set<PlayerRewardCallback> = new Set();
  private onLootSpawnHandlers: Set<GroundLootSpawnCallback> = new Set();
  private onLootCurrentHandlers: Set<GroundLootCurrentCallback> = new Set();
  private onLootPickedHandlers: Set<GroundLootPickedCallback> = new Set();
  private onCharacterLoadedHandlers: Set<CharacterLoadedCallback> = new Set();

  public connect(): Socket {
    if (this.socket) {
      return this.socket;
    }

    console.log(`[NetworkService] Menghubungkan ke game server di ${SERVER_URL}...`);
    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      const socketId = this.socket?.id ?? null;
      console.log(`[NetworkService] Terhubung ke Server! Socket ID: ${socketId}`);
      useGameStore.getState().setServerStatus(true, socketId);

      // Login dengan username akun yang tersimpan
      const username = useGameStore.getState().accountUsername || 'novice';
      this.joinGame({
        username,
        name: useGameStore.getState().player.name,
      });
    });

    this.socket.on('server:welcome', (data: { message: string; socketId: string; serverTime: number }) => {
      console.log(`[NetworkService] Pesan dari server: "${data.message}" (ID: ${data.socketId})`);
    });

    this.socket.on('current:players', (players: PlayerData[]) => {
      console.log(`[NetworkService] Menerima daftar ${players.length} pemain aktif dari server`);
      this.onCurrentPlayersHandlers.forEach((cb) => cb(players));
    });

    this.socket.on('player:joined', (player: PlayerData) => {
      console.log(`[NetworkService] Pemain baru bergabung: ${player.name} (${player.id})`);
      this.onPlayerJoinedHandlers.forEach((cb) => cb(player));
    });

    this.socket.on('player:left', (id: string) => {
      console.log(`[NetworkService] Pemain keluar: ${id}`);
      this.onPlayerLeftHandlers.forEach((cb) => cb(id));
    });

    this.socket.on('player:moved', (data: PlayerMovedBroadcast) => {
      this.onPlayerMovedHandlers.forEach((cb) => cb(data));
    });

    this.socket.on('chat:broadcast', (msg: ChatMessage) => {
      this.onChatMessageHandlers.forEach((cb) => cb(msg));
    });

    this.socket.on('monsters:init', (monsters: ServerMonsterData[]) => {
      this.onMonstersUpdateHandlers.forEach((cb) => cb(monsters));
    });

    this.socket.on('monsters:update', (monsters: ServerMonsterData[]) => {
      this.onMonstersUpdateHandlers.forEach((cb) => cb(monsters));
    });

    this.socket.on('combat:hit', (data: CombatHitBroadcast) => {
      this.onCombatHitHandlers.forEach((cb) => cb(data));
    });

    this.socket.on('player:reward', (reward: PlayerRewardBroadcast) => {
      this.onPlayerRewardHandlers.forEach((cb) => cb(reward));
    });

    this.socket.on('loot:current', (items: GroundItemData[]) => {
      this.onLootCurrentHandlers.forEach((cb) => cb(items));
    });

    this.socket.on('loot:spawned', (loot: GroundItemData) => {
      this.onLootSpawnHandlers.forEach((cb) => cb(loot));
    });

    this.socket.on('loot:picked', (data: LootPickedBroadcast) => {
      this.onLootPickedHandlers.forEach((cb) => cb(data));
    });

    this.socket.on('character:loaded', (char: CharacterSyncPayload) => {
      console.log(`[NetworkService] Data karakter SQLite diterima untuk '${char.username}'`);
      this.onCharacterLoadedHandlers.forEach((cb) => cb(char));
    });

    this.socket.on('disconnect', (reason: string) => {
      this.isConnected = false;
      console.warn(`[NetworkService] Terputus dari server: ${reason}`);
      useGameStore.getState().setServerStatus(false, null);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error(`[NetworkService] Gagal terhubung ke server:`, error.message);
      useGameStore.getState().setServerStatus(false, null);
    });

    return this.socket;
  }

  public joinGame(payload: JoinPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player:join', payload);
    }
  }

  public onCurrentPlayers(cb: CurrentPlayersCallback): () => void {
    this.onCurrentPlayersHandlers.add(cb);
    return () => this.onCurrentPlayersHandlers.delete(cb);
  }

  public onPlayerJoined(cb: PlayerJoinedCallback): () => void {
    this.onPlayerJoinedHandlers.add(cb);
    return () => this.onPlayerJoinedHandlers.delete(cb);
  }

  public onPlayerLeft(cb: PlayerLeftCallback): () => void {
    this.onPlayerLeftHandlers.add(cb);
    return () => this.onPlayerLeftHandlers.delete(cb);
  }

  public onPlayerMoved(cb: PlayerMovedCallback): () => void {
    this.onPlayerMovedHandlers.add(cb);
    return () => this.onPlayerMovedHandlers.delete(cb);
  }

  public onChatMessage(cb: ChatMessageCallback): () => void {
    this.onChatMessageHandlers.add(cb);
    return () => this.onChatMessageHandlers.delete(cb);
  }

  public onMonstersUpdate(cb: MonstersUpdateCallback): () => void {
    this.onMonstersUpdateHandlers.add(cb);
    return () => this.onMonstersUpdateHandlers.delete(cb);
  }

  public onCombatHit(cb: CombatHitCallback): () => void {
    this.onCombatHitHandlers.add(cb);
    return () => this.onCombatHitHandlers.delete(cb);
  }

  public onPlayerReward(cb: PlayerRewardCallback): () => void {
    this.onPlayerRewardHandlers.add(cb);
    return () => this.onPlayerRewardHandlers.delete(cb);
  }

  public onLootCurrent(cb: GroundLootCurrentCallback): () => void {
    this.onLootCurrentHandlers.add(cb);
    return () => this.onLootCurrentHandlers.delete(cb);
  }

  public onLootSpawn(cb: GroundLootSpawnCallback): () => void {
    this.onLootSpawnHandlers.add(cb);
    return () => this.onLootSpawnHandlers.delete(cb);
  }

  public onLootPicked(cb: GroundLootPickedCallback): () => void {
    this.onLootPickedHandlers.add(cb);
    return () => this.onLootPickedHandlers.delete(cb);
  }

  public onCharacterLoaded(cb: CharacterLoadedCallback): () => void {
    this.onCharacterLoadedHandlers.add(cb);
    return () => this.onCharacterLoadedHandlers.delete(cb);
  }

  public saveCharacter(payload: CharacterSyncPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('character:save', payload);
    }
  }

  public sendPickupLoot(payload: PickupLootPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('loot:pickup', payload);
    }
  }

  public sendAttack(payload: PlayerAttackPayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player:attack', payload);
    }
  }

  public sendChatMessage(text: string): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('chat:send', text);
    }
  }

  public sendMovement(payload: PlayerMovePayload): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('player:move', payload);
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

export const networkService = new NetworkService();

