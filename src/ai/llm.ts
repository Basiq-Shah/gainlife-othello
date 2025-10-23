import { algebraicToCoord, Board, Player, validMoves } from '../logic/othello'
import { Keys } from '../keys'
import { Provider } from 'react-redux'

export type Provider = 'openai' | 'anthropic' | 'gemini'
export interface LLMConfig {
  provider: Provider
  keys: Keys
  model?: string
}
const letters = `ABCDEFGHIJKLMNOPQRSTUVWXYZ`

export function systemPrompt(diff: string, board: Board, isRetry: boolean): string {
  // Generates system prompts based on game difficulty, and whether this is the first or second prompt attempt
  const pos = board.length
  const letter = letters[pos]
  let promptDiff = ''
  const easyStr = `You are a beginner Othello (Reversi) player.`
  const mediumStr = `You are an intermediate Othello (Reversi) player.`
  const hardStr = `You are a world-class Othello (Reversi) player.`
  switch (diff) {
    case "easy":
      promptDiff = easyStr
      break
    case "medium":
      promptDiff = mediumStr
      break
    default:
      promptDiff = hardStr
  }
  const retryLine = isRetry ? `ONLY select a value from the provided list of legal moves.` : `Never respond with "PASS" unless *no legal moves* exist. Do not explain or comment.`
  const prompt = `${promptDiff}
    Respond with ONLY one valid move for the current player in standard algebraic form (A–${letter} followed by 1–${pos}), for example "D3".
    ${retryLine} Output just the coordinate.`
  return prompt
}

export function userPrompt(board: Board, current: Player, retryList: string = '') {
  const pos = board.length
  const retryLine = retryList ? `List of Legal Moves: ${retryList}` : `If you cannot find a legal move, return "PASS"`
  const asciiBoard = boardToAscii(board, current)

  return `Board (${pos}x${pos}), '.' = empty, B=Black, W=White. Return a single legal move for ${current}.
    ${retryLine}.
    ${asciiBoard}`
}


export async function chooseMoveLLM(cfg: LLMConfig, board: Board, current: Player, diff: string, retryList: string = ''): Promise<string> {
  let user;
  if (retryList) {
    user = userPrompt(board, current, retryList)
  } else {
    user = userPrompt(board, current)
  }
  let sys = systemPrompt(diff, board, true)
  console.log(sys)
  console.log(user)
  try {
    switch (cfg.provider) {
      case "openai":
        return openAIPrompt(cfg, user, sys)
      case "anthropic":
        return anthropicPrompt(cfg, user, sys)
      case "gemini":
        return geminiPrompt(cfg, user, sys)
      default:
        throw new Error('Unsupported provider')
    }
  } catch (error: unknown) {
    console.error("An error occurred:", error);
  }

  throw new Error('Unsupported provider')
}

export async function openAIPrompt(cfg: LLMConfig, user: string, sys: string): Promise<string> {
  const model = cfg.model ?? "gpt-4o-mini";
  const url = "https://api.openai.com/v1/chat/completions";

  const payload = {
    model,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    temperature: 0,
  };

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cfg.keys.openai}`,
  };

  const data = await postJSON<any>(url, headers, payload);
  return data?.choices?.[0]?.message?.content?.trim() ?? "PASS"
}


export async function geminiPrompt(cfg: LLMConfig, user: string, sys: string): Promise<string> {
  const model = cfg.model ?? "gemini-2.5-flash";

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `${sys}\n\n${user}`,
          },
        ],
      },
    ],
  };

  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${cfg.keys.gemini}`;
  const header = { "Content-Type": "application/json" }

  const data = await postJSON<any>(url, header, body);
  // console.log('[LLM DEBUG] Raw response JSON:', j)

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "PASS";
  return text;
}

async function anthropicPrompt(cfg: LLMConfig, user: string, sys: string): Promise<string> {
  const model = cfg.model ?? "claude-3-5-sonnet-latest";
  const url = "https://api.anthropic.com/v1/messages";

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": cfg.keys.anthropic,
    "anthropic-version": "2023-06-01",
  };

  const body = {
    model,
    max_tokens: 10,
    temperature: 0,
    system: sys,
    messages: [{ role: "user", content: user }],
  };

  const data = await postJSON<any>(url, headers, body);
  return data.content?.[0]?.text?.trim() ?? 'PASS'
}

export function sanitizeMove(board: Board, current: Player, raw: string): { algebraic: string | null } {
  const m = raw.trim().toUpperCase().replace(/[^A-H1-8]/g, '')
  // attempt to pull something like D3 out of the mess
  const match = m.match(/[A-H][1-8]/)
  if (!match) return { algebraic: null }
  const alg = match[0]
  const v = validMoves(board, current)
  const coord = algebraicToCoord(alg)!
  const ok = v.some(x => x.r === coord.r && x.c === coord.c)
  return { algebraic: ok ? alg : null }
}

export async function postJSON<T>(url: string, headers: Record<string, string>, body: any): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({} as any));
    console.error(`[HTTP ERROR ${res.status}]`, err);
    throw new Error(err.error?.message ?? `Request failed with ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function chooseProvider(key: Keys): Provider {
  if (key?.openai) {
    return "openai"
  } else if (key?.anthropic) {
    return "anthropic"
  }
  return "gemini"
}

function boardToAscii(board: Board, current: Player) {
  let out = '   ' + letters.slice(0, board.length).split('').join(' ') + '\n'
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