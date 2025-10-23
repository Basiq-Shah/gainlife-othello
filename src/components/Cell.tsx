import React from 'react'

export const Cell: React.FC<{
  value: 'B' | 'W' | null
  highlight?: boolean
  onClick?: () => void
}> = ({ value, highlight, onClick }) => {
  const isEmpty = value === null;
  const bg = highlight
    ? 'rgba(0, 255, 0, 0.4)'
    : isEmpty
      ? '#0e5e37ff'
      : 'transparent';

  const disc = value ? (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: value === 'B' ? '#111' : '#eee',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.35)',
      }}
    />
  ) : null;

  return (
    <button
      onClick={onClick}
      style={{
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        border: '1px solid #0a0a0a33',
        cursor: 'pointer',
      }}
      aria-label="board-cell"
    >
      {disc}
    </button>
  );
};
