export type GameMode = 'cash' | 'tournament'
export type PlayerType = 'LAG' | 'LP' | 'TAG' | 'TP'
export type Street = 'preflop' | 'flop' | 'turn' | 'river'
export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB'

export interface Opponent {
  position: Position
  type: PlayerType
  stackBb: number
  inHand: boolean
}
export interface AnswerOption {
  id: string
  label: string
  evBb: number
  explanation: string
  action?: 'fold' | 'call' | 'check' | 'raise' | 'all-in'
  sizeBb?: number
}
export interface HandAction {
  position: Position | 'dealer'
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in' | 'post' | 'deal'
  /** Chips added by this action, not the total bet. */
  amountBb: number
  street: Street
}
export interface PokerQuestion {
  id: string
  enabled: boolean
  mode: GameMode
  title: string
  category: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
  street: Street
  context: string
  heroPosition: Position
  heroCards: [string, string]
  board: string[]
  effectiveStackBb: number
  potBb: number
  toCallBb: number
  opponents: Opponent[]
  history: string[]
  prompt: string
  evBasis: string
  options: AnswerOption[]
  actions?: HandAction[]
  heroInvestedBb?: number
  minRaiseToBb?: number
}
export interface QuestionBank { version: 1; revision?: number; questions: PokerQuestion[] }
export interface AnswerRecord { question: PokerQuestion; optionId: string; raiseToBb?: number; chosenAction?: 'all-in'; elapsedMs: number }
export interface QuizResult { mode: GameMode; answers: AnswerRecord[]; completedAt: string }

export const modeLabels: Record<GameMode, string> = { cash: 'リングゲーム', tournament: 'トーナメント' }
export const streetLabels: Record<Street, string> = { preflop: 'プリフロップ', flop: 'フロップ', turn: 'ターン', river: 'リバー' }
export const difficultyLabels = { basic: '基礎', intermediate: '応用', advanced: '発展' }
export const positions: Position[] = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
export const playerTypes: Record<PlayerType, { name: string; english: string; description: string }> = {
  LAG: { name: 'ルース・アグレッシブ', english: 'Loose Aggressive', description: '幅広いハンドで参加し、ベットやレイズを多く使う。' },
  LP: { name: 'ルース・パッシブ', english: 'Loose Passive', description: '幅広いハンドで参加し、チェックやコールが多い。' },
  TAG: { name: 'タイト・アグレッシブ', english: 'Tight Aggressive', description: '参加ハンドを絞り、ベットやレイズを積極的に使う。' },
  TP: { name: 'タイト・パッシブ', english: 'Tight Passive', description: '参加ハンドを絞り、チェックやコールが多い。' },
}
