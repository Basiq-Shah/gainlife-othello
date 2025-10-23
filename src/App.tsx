import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from './store/store'
import Board from './components/Board'
import { coordToAlgebraic, validMoves, algebraicToCoord } from './logic/othello'
import { reset, setAIThinking, setMode, play } from './store/gameSlice'
import { chooseMoveLLM, sanitizeMove, LLMConfig, chooseProvider } from './ai/llm'
import { loadKeys } from './keys'
const models: Record<string, string[]> = {
  'openai': ['gpt-5-mini', "gpt-4o-mini", "gpt-4o"],
  'anthropic': ["claude-3-5-sonnet", "claude-3-5-haiku", "claude-3-opus"],
  'gemini': ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"],
};

export default function App() {
  const [keys, setKeys] = useState<any>(null);
  useEffect(() => { loadKeys().then(setKeys); }, []); // loads keys in keys.json
  const dispatch = useDispatch()
  const game = useSelector((s: RootState) => s.game)
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'gemini'>(chooseProvider(keys))
  const [model, setModel] = useState<string>('gemini-2.5-flash')
  const [log, setLog] = useState<string[]>([])
  const [diff, setDiff] = useState<string>('hard')

  const currentValid = validMoves(game.board, game.current);
  const status = `Turn: ${game.current} | Valid moves: ${currentValid.map(coordToAlgebraic).join(', ') || 'none'}`

  async function requestAIMove() {
    // the logic for an AI's turn. Only enabled if the game is in player vs AI mode, and it is white's turn.
    if (game.winner) return;
    dispatch(setAIThinking(true));
    try {
      const cfg: LLMConfig = { provider, keys, model };
      const raw = await chooseMoveLLM(cfg, game.board, game.current, diff); // Sends control flow to llm.ts. This is where the logic for generating prompts, sending them to the API, and parsing the result is handled.
      const { algebraic } = sanitizeMove(game.board, game.current, raw || 'PASS');

      if (algebraic) {
        // plays move if it is valid
        dispatch(play(algebraicToCoord(algebraic)!));
        setLog(l => [`AI -> ${algebraic}`, ...l].slice(0, 100));
        return;
      }
      // If move was invalid, tries to get AI move again, but this time while explicitly telling the AI what moves are valid.
      setLog(l => [`AI invalid move: ${raw} | Retrying...`, ...l].slice(0, 100));
      const raw2 = await chooseMoveLLM(cfg, game.board, game.current, diff, currentValid.map(coordToAlgebraic).join(', '));
      const { algebraic: alg2 } = sanitizeMove(game.board, game.current, raw2 || 'PASS');

      if (alg2) {
        dispatch(play(algebraicToCoord(alg2)!));
        setLog(l => [`AI (retry) -> ${alg2}`, ...l].slice(0, 100));
      } else {
        // On the HIGHLY unlikely chance that the previous two prompts fail, simply choose a random move from the list of valid moves. This failsafe has never triggered for me yet.
        const rand = currentValid[Math.floor(Math.random() * currentValid.length)];
        dispatch(play(rand));
        setLog(l => [`AI failed twice (${raw}/${raw2}). Quick Choose: ${rand}.`, ...l].slice(0, 100));
      }
    } catch (e: any) {
      console.error(e);
      setLog(l => [`AI error: ${e.message}`, ...l].slice(0, 100));
    } finally {
      dispatch(setAIThinking(false));
    }
  }
  // This runs every render, and checks if we need to run the logic of requestAIMove
  useEffect(() => {
    if (game.mode === 'PV_AI' && game.current === 'W') { requestAIMove(); }
  }, [game.mode, game.current]);

  function getWinText() {
    if (!game.winner) return null;
    if (game.winner === 'DRAW') return 'Draw!';
    if (game.mode === 'PVP') return game.winner === 'B' ? 'Black Wins!' : 'White Wins!';
    // PvAI (White = AI)
    return game.winner === 'B' ? 'You win!' : 'AI wins!';
  }
  const winText = getWinText();


  return (
    <div style={{ display: 'grid', gap: 16, width: 600, gridTemplateColumns: '1fr 300px' }}>
      <div style={{ display: 'grid', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Othello — Gain Life Challenge</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => dispatch(reset({ mode: 'PVP' }))}>New Game: PvP</button>
          <button onClick={() => { dispatch(setMode('PV_AI')); dispatch(reset({ mode: 'PV_AI' })) }}>New Game: vs LLM</button>
          <span style={{ opacity: 0.7 }}>{status}</span>
        </div>
        <div style={{ position: 'relative' }}>
          <Board />
          {winText && (
            <div
              style={{
                position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
                background: 'rgba(0,0,0,0.55)', color: '#fff'
              }}
              aria-label="game-over-overlay"
            >
              <div style={{ textAlign: 'center', padding: 16, background: 'rgba(0,0,0,0.35)', borderRadius: 12 }}>
                <h2 style={{ margin: '0 0 12px 0' }}>{winText}</h2>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <button onClick={() => { dispatch(setMode('PVP')); dispatch(reset({ mode: 'PVP' })); }}>
                    Play Again vs Human
                  </button>
                  <button onClick={() => { dispatch(setMode('PV_AI')); dispatch(reset({ mode: 'PV_AI' })); }}>
                    Play Again vs AI
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <aside style={{ display: 'grid', gap: 12 }}>
        <section style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3>AI Settings</h3>
          <label>Provider:&nbsp;
            <select value={provider} onChange={e => setProvider(e.target.value as any)}>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </label>
          <br />
          <label>
            Model:&nbsp;
            <select value={model} onChange={(e) => setModel(e.target.value)}>
              {models[provider].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <br />
          <label>
            Model:&nbsp;
            <select value={model} onChange={(e) => setDiff(e.target.value)}>
              <option value="hard">Hard</option>
              <option value="medium">Medium</option>
              <option value="easy">Easy</option>
            </select>
          </label>
          <br />
          <button disabled={game.aiThinking || game.current !== 'W' || game.mode !== 'PV_AI'} onClick={requestAIMove}>
            {game.aiThinking ? 'Thinking…' : 'Force AI Move'}
          </button>
        </section>

        <section style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3>Move Log</h3>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12, height: 260, overflow: 'auto', background: '#f7f7f7', padding: 8 }}>
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </section>

        <section style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
          <h3>Rules:</h3>
          <p>Players take turns placing discs to outflank their opponent’s pieces. Any outflanked pieces are flipped to the player’s color.</p>
          <p>If a player has no legal move, they must pass. The game ends when neither player can move.</p>
          <p>Black (B) moves first. Legal moves are highlighted in light green.</p>

        </section>
      </aside>
    </div>
  )
}
