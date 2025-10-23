export type Cell = 'B' | 'W' | null
export type Player = 'B' | 'W'
export type Board = Cell[][]
export type Coord = { r: number; c: number }
export type GameMode = 'PVP' | 'PV_AI'
export type difficulty = "easy" | "medium" | "hard"
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'


const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1]
] as const

export function emptyBoard(size = 8): Board {
  return Array.from({ length: size }, () => Array.from({ length: size }, () => null as Cell))
}

export function initialBoard(size = 8): Board {
  const b = emptyBoard(size)
  const mid = size / 2
  b[mid - 1][mid - 1] = 'W'
  b[mid][mid] = 'W'
  b[mid - 1][mid] = 'B'
  b[mid][mid - 1] = 'B'
  return b
}

export function inBounds(b: Board, r: number, c: number) {
  return r >= 0 && c >= 0 && r < b.length && c < b.length
}

export function flipsFor(b: Board, p: Player, move: Coord): Coord[] {
  if (b[move.r][move.c] !== null) return []
  const opp: Player = p === 'B' ? 'W' : 'B'
  const flips: Coord[] = []

  for (const [dr, dc] of DIRS) {
    let r = move.r + dr, c = move.c + dc
    const line: Coord[] = []
    while (inBounds(b, r, c) && b[r][c] === opp) {
      line.push({ r, c })
      r += dr; c += dc
    }
    if (line.length > 0 && inBounds(b, r, c) && b[r][c] === p) {
      flips.push(...line)
    }
  }
  return flips
}

export function canPlay(b: Board, p: Player, move: Coord): boolean {
  return flipsFor(b, p, move).length > 0
}

export function validMoves(b: Board, p: Player): Coord[] {
  const out: Coord[] = []
  for (let r = 0; r < b.length; r++) {
    for (let c = 0; c < b.length; c++) {
      if (canPlay(b, p, { r, c })) out.push({ r, c })
    }
  }
  return out
}

export function applyMove(b: Board, p: Player, move: Coord): Board {
  const flips = flipsFor(b, p, move)
  if (flips.length === 0) return b
  const nb = b.map(row => row.slice())
  nb[move.r][move.c] = p
  for (const f of flips) nb[f.r][f.c] = p
  return nb
}

export function nextPlayer(p: Player): Player {
  return p === 'B' ? 'W' : 'B'
}

export function score(b: Board): [number, number] {
  let black = 0, white = 0
  for (let r = 0; r < b.length; r++) {
    for (let c = 0; c < b.length; c++) {
      if (b[r][c] === 'B') black++
      else if (b[r][c] === 'W') white++
    }
  }
  return [black, white]
}

export function isGameOver(b: Board): boolean {
  return validMoves(b, 'B').length === 0 && validMoves(b, 'W').length === 0
}

export function coordToAlgebraic(coord: Coord): string {
  return letters[coord.c] + String(coord.r + 1)
}

export function algebraicToCoord(s: string): Coord | null {
  const m = s.trim().toUpperCase().match(/^([A-H])([1-8])$/)
  if (!m) return null
  const c = letters.indexOf(m[1])
  const r = parseInt(m[2], 10) - 1
  return { r, c }
}

export function initialStateFor(mode: GameMode) {
  return {
    board: initialBoard(),
    current: 'B' as Player,
    mode
  }
}

export function boardToAscii(board: Board, current: Player) {
  const pos = board.length
  let out = '   ' + letters.slice(0, pos).split('').join(' ') + '\n'
  for (let r = 0; r < board.length; r++) {
    let row = (r + 1).toString().padStart(2, ' ') + ' '
    for (let c = 0; c < board.length; c++) {
      row += (board[r][c] ?? '.') + ' '
    }
    out += row + '\n'
  }
  out += `Current: ${current}`
  return out
}
