import { useEffect, useRef, useCallback } from 'react';
import { useSnakeGame, Direction } from './hooks/useSnakeGame';

function App() {
  const {
    snake,
    food,
    gameState,
    score,
    highScore,
    difficulty,
    gridSize,
    eatenAnimation,
    startGame,
    restartGame,
    togglePause,
    changeDirection,
    changeDifficulty,
  } = useSnakeGame();

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        s: 'DOWN',
        a: 'LEFT',
        d: 'RIGHT',
        W: 'UP',
        S: 'DOWN',
        A: 'LEFT',
        D: 'RIGHT',
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        if (gameState === 'playing') {
          changeDirection(keyMap[e.key]);
        }
      }

      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        if (gameState === 'playing' || gameState === 'paused') {
          togglePause();
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        if (gameState === 'gameover') {
          restartGame();
        }
      }

      if (e.key === 'Enter') {
        if (gameState === 'idle' || gameState === 'gameover') {
          startGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, changeDirection, togglePause, restartGame, startGame]);

  // Touch swipe controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      changeDirection(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStartRef.current = null;
  }, [changeDirection]);

  const handleDPad = useCallback((dir: Direction) => {
    if (gameState === 'playing') {
      changeDirection(dir);
    }
  }, [gameState, changeDirection]);

  // Calculate board dimensions
  const boardPx = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.55, 500);
  const cellPx = boardPx / gridSize;

  const getEyeEmoji = () => {
    if (snake.length < 2) return '👀';
    const head = snake[0];
    const neck = snake[1];
    const dx = head.x - neck.x;
    const dy = head.y - neck.y;
    if (dx === 1) return '👉';
    if (dx === -1) return '👈';
    if (dy === 1) return '👇';
    if (dy === -1) return '👆';
    return '👀';
  };

  return (
    <div
      className="flex flex-col items-center justify-center select-none"
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ width: '100%', maxWidth: '500px', marginBottom: '12px' }}>
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            textAlign: 'center',
            background: 'linear-gradient(90deg, #4ade80, #10b981)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '8px',
          }}
        >
          🐍 Змейка
        </h1>

        {/* Score Board */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Счёт</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', fontVariantNumeric: 'tabular-nums' }}>{score}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Рекорд</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#facc15', fontVariantNumeric: 'tabular-nums' }}>{highScore}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button
                key={d}
                onClick={() => changeDifficulty(d)}
                disabled={gameState === 'playing' || gameState === 'paused'}
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  border: 'none',
                  cursor: (gameState === 'playing' || gameState === 'paused') ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  opacity: (gameState === 'playing' || gameState === 'paused') && difficulty !== d ? 0.5 : 1,
                  background: difficulty === d
                    ? d === 'easy' ? '#22c55e' : d === 'medium' ? '#eab308' : '#ef4444'
                    : '#374151',
                  color: difficulty === d ? 'white' : '#d1d5db',
                  boxShadow: difficulty === d
                    ? d === 'easy' ? '0 4px 14px rgba(34,197,94,0.3)' : d === 'medium' ? '0 4px 14px rgba(234,179,8,0.3)' : '0 4px 14px rgba(239,68,68,0.3)'
                    : 'none',
                }}
              >
                {d === 'easy' ? 'Легко' : d === 'medium' ? 'Средне' : 'Сложно'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          width: `${boardPx}px`,
          height: `${boardPx}px`,
          border: '2px solid #4b5563',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.1)',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          touchAction: 'none',
        }}
      >
        {/* Grid cells */}
        {Array.from({ length: gridSize * gridSize }).map((_, i) => {
          const x = i % gridSize;
          const y = Math.floor(i / gridSize);
          const isDark = (x + y) % 2 === 0;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${x * cellPx}px`,
                top: `${y * cellPx}px`,
                width: `${cellPx}px`,
                height: `${cellPx}px`,
                background: isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(31, 41, 55, 0.1)',
              }}
            />
          );
        })}

        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={`snake-${index}-${segment.x}-${segment.y}`}
            style={{
              position: 'absolute',
              left: `${segment.x * cellPx}px`,
              top: `${segment.y * cellPx}px`,
              width: `${cellPx}px`,
              height: `${cellPx}px`,
              borderRadius: index === 0 ? '4px' : '3px',
              background: index === 0
                ? 'linear-gradient(135deg, #86efac, #22c55e)'
                : `linear-gradient(135deg, #4ade80, #16a34a)`,
              opacity: index === 0 ? 1 : Math.max(0.5, 1 - index * 0.015),
              transform: index === 0 ? 'scale(1.05)' : 'scale(0.88)',
              zIndex: index === 0 ? 10 : 5,
              boxShadow: index === 0 ? '0 0 10px rgba(34, 197, 94, 0.5)' : 'none',
              transition: 'left 0.05s linear, top 0.05s linear',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${cellPx * 0.5}px`,
            }}
          >
            {index === 0 && getEyeEmoji()}
          </div>
        ))}

        {/* Food */}
        <div
          style={{
            position: 'absolute',
            left: `${food.x * cellPx}px`,
            top: `${food.y * cellPx}px`,
            width: `${cellPx}px`,
            height: `${cellPx}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            animation: 'pulse 1s ease-in-out infinite',
          }}
        >
          <div
            style={{
              width: '75%',
              height: '75%',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f87171, #dc2626)',
              boxShadow: '0 0 12px rgba(239, 68, 68, 0.6)',
              animation: 'bounce 1s ease-in-out infinite',
            }}
          />
        </div>

        {/* Eaten animation */}
        {eatenAnimation && (
          <div
            style={{
              position: 'absolute',
              left: `${eatenAnimation.x * cellPx}px`,
              top: `${eatenAnimation.y * cellPx}px`,
              width: `${cellPx}px`,
              height: `${cellPx}px`,
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'rgba(250, 204, 21, 0.4)',
                animation: 'ping 0.4s ease-out forwards',
              }}
            />
          </div>
        )}

        {/* Idle overlay */}
        {gameState === 'idle' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 30,
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🐍</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Змейка</h2>
            <p style={{ color: '#d1d5db', fontSize: '0.875rem', marginBottom: '16px', textAlign: 'center', padding: '0 16px' }}>
              Управление: стрелки / WASD / свайпы
            </p>
            <button
              onClick={startGame}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(90deg, #22c55e, #059669)',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Начать игру
            </button>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '12px' }}>или нажмите Enter</p>
          </div>
        )}

        {/* Paused overlay */}
        {gameState === 'paused' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 30,
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏸️</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '16px' }}>Пауза</h2>
            <button
              onClick={togglePause}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(90deg, #3b82f6, #4f46e5)',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Продолжить
            </button>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '12px' }}>или нажмите Space</p>
          </div>
        )}

        {/* Game Over overlay */}
        {gameState === 'gameover' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.75)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 30,
              animation: 'fadeIn 0.3s ease-out',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>💀</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>Игра окончена</h2>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#facc15', marginBottom: '4px' }}>{score}</p>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '16px' }}>
              {score >= highScore && score > 0 ? '🏆 Новый рекорд!' : `Рекорд: ${highScore}`}
            </p>
            <button
              onClick={restartGame}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(90deg, #22c55e, #059669)',
                color: 'white',
                fontWeight: 'bold',
                borderRadius: '9999px',
                border: 'none',
                fontSize: '1rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Играть снова
            </button>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '12px' }}>или нажмите R</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ width: '100%', maxWidth: '500px', marginTop: '16px' }}>
        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '16px' }}>
          {gameState === 'playing' && (
            <button
              onClick={togglePause}
              style={{
                padding: '8px 20px',
                background: '#374151',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4b5563'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#374151'; }}
            >
              <span>⏸</span> Пауза
            </button>
          )}
          {gameState === 'paused' && (
            <button
              onClick={togglePause}
              style={{
                padding: '8px 20px',
                background: '#2563eb',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#3b82f6'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#2563eb'; }}
            >
              <span>▶</span> Продолжить
            </button>
          )}
          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              onClick={restartGame}
              style={{
                padding: '8px 20px',
                background: '#374151',
                color: 'white',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#4b5563'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#374151'; }}
            >
              <span>🔄</span> Заново
            </button>
          )}
        </div>

        {/* D-Pad for mobile */}
        <div style={{ display: 'flex', justifyContent: 'center' }} className="dpad-container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '160px' }}>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('UP'); }}
              onClick={() => handleDPad('UP')}
              className="dpad-btn"
              style={{
                background: 'rgba(55, 65, 81, 0.8)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.25rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              ▲
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('LEFT'); }}
              onClick={() => handleDPad('LEFT')}
              className="dpad-btn"
              style={{
                background: 'rgba(55, 65, 81, 0.8)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.25rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              ◀
            </button>
            <div style={{ background: 'rgba(31, 41, 55, 0.5)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' }}>
              ●
            </div>
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('RIGHT'); }}
              onClick={() => handleDPad('RIGHT')}
              className="dpad-btn"
              style={{
                background: 'rgba(55, 65, 81, 0.8)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.25rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              ▶
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('DOWN'); }}
              onClick={() => handleDPad('DOWN')}
              className="dpad-btn"
              style={{
                background: 'rgba(55, 65, 81, 0.8)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '1.25rem',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              ▼
            </button>
            <div />
          </div>
        </div>

        {/* Desktop hints */}
        <div className="desktop-hints" style={{ display: 'none', justifyContent: 'center', gap: '16px', color: '#6b7280', fontSize: '0.75rem', marginTop: '8px' }}>
          <span>← → ↑ ↓ — движение</span>
          <span>Space — пауза</span>
          <span>R — рестарт</span>
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2); opacity: 0; }
        }
        .dpad-btn:active {
          background: #16a34a !important;
        }
        @media (min-width: 768px) {
          .dpad-container {
            display: none !important;
          }
          .desktop-hints {
            display: flex !important;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
