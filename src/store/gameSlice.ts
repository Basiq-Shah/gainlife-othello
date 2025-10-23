import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { Board, Player, Coord, GameMode, initialStateFor, canPlay, applyMove, nextPlayer, validMoves, score, isGameOver } from '../logic/othello'

export interface GameState {
  board: Board
  current: Player
  mode: GameMode
  aiThinking: boolean
  winner: Player | 'DRAW' | null
  lastMove: Coord | null
}

const initial = initialStateFor('PVP')

const slice = createSlice({
  name: 'game',
  initialState: {
    ...initial,
    aiThinking: false,
    winner: null,
    lastMove: null,
  } as GameState,
  reducers: {
    reset(state, action: PayloadAction<{ mode: GameMode }>) {
      const s = initialStateFor(action.payload.mode)
      state.board = s.board
      state.current = s.current
      state.mode = s.mode
      state.winner = null
      state.lastMove = null
      state.aiThinking = false
    },
    play(state, action: PayloadAction<Coord>) {
      const move = action.payload
      if (!canPlay(state.board, state.current, move)) return
      state.board = applyMove(state.board, state.current, move)
      state.lastMove = move
      if (isGameOver(state.board)) {
        const [b, w] = score(state.board)
        state.winner = b === w ? 'DRAW' : (b > w ? 'B' : 'W')
        return
      }
      const opp = nextPlayer(state.current)
      if (validMoves(state.board, opp).length === 0) {
      } else {
        state.current = opp
      }
    },
    setAIThinking(state, action: PayloadAction<boolean>) {
      state.aiThinking = action.payload
    },
    setMode(state, action: PayloadAction<GameMode>) {
      state.mode = action.payload
    },
  }
})

export const { reset, play, setAIThinking, setMode } = slice.actions
export default slice.reducer
