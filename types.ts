
export enum GameStatus {
  LOBBY = 'LOBBY',
  MATCHMAKING = 'MATCHMAKING',
  PLAYING = 'PLAYING',
  WON = 'WON',
  LOST = 'LOST'
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  hp: number;
  score: number;
  isReady: boolean;
  isBot?: boolean;
}

export interface PowerUpState {
  vowelScanAvailable: boolean;
  shieldBoostAvailable: boolean;
}

export interface GameState {
  status: GameStatus;
  word: string;
  category: string;
  hint: string;
  guessedLetters: string[];
  players: Player[];
  winnerId?: string;
  turnStartTime: number;
  timeLeft: number;
  isStunned?: boolean;
  powerUps: PowerUpState;
}

export interface WordData {
  word: string;
  category: string;
  hint: string;
}
