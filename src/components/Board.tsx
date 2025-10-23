import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { validMoves } from '../logic/othello'
import { play } from '../store/gameSlice'
import { Cell } from './Cell'

export default function Board() {
  const dispatch = useDispatch()
  const { board, current,  } = useSelector((s: RootState) => s.game)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 44px)', gap: 4, background: '#0c3d1dff', padding: 8, borderRadius: 8, }} >
      {board.map((row, r) => row.map((cell, c) => {
        const highlight = validMoves(board, current).some(h => h.r===r && h.c===c)
        return <div key={r+'-'+c} data-id={`${r}-${c}`}><Cell value={cell} highlight={highlight} onClick={()=>dispatch(play({r, c}))} /></div>
      }))}
    </div>
  )
}
