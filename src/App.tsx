import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useSnakeGame, Direction } from './hooks/useSnakeGame';

function App() {
  const {
    canvasRef,
    gameState,
    score,
    highScore,
    difficulty,
    portalsEnabled,
    startGame,
    restartGame,
    togglePause,
    changeDirection,
    changeDifficulty,
    togglePortals,
    drawRef,
  } = useSnakeGame();

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState(() => {
    if (typeof window !== 'undefined') {
      return Math.min(window.innerWidth * 0.85, window.innerHeight * 0.5, 500);
    }
    return 400;
  });

  // Resize canvas
  useEffect(() => {
    const updateSize = () => {
      const size = Math.max(200, Math.min(window.innerWidth * 0.85, window.innerHeight * 0.5, 500));
      setCanvasSize(Math.floor(size));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Set canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      drawRef.current();
    }
  }, [canvasSize]);

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

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: '16px',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ width: '100%', maxWidth: `${canvasSize}px`, marginBottom: '12px' }}>
        <h1 style={{
          fontSize: 'clamp(1.5rem, 5vw, 2rem)',
          fontWeight: 'bold',
          textAlign: 'center',
          background: 'linear-gradient(90deg, #4ade80, #10b981)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
        }}>
          🐍 Змейка
        </h1>

        {/* Score Board */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 8px',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
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
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
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
            <button
              onClick={togglePortals}
              disabled={gameState === 'playing' || gameState === 'paused'}
              style={{
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '0.7rem',
                fontWeight: 500,
                border: 'none',
                cursor: (gameState === 'playing' || gameState === 'paused') ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: (gameState === 'playing' || gameState === 'paused') ? 0.5 : 1,
                background: portalsEnabled
                  ? 'linear-gradient(90deg, #a855f7, #f97316)'
                  : '#374151',
                color: portalsEnabled ? 'white' : '#d1d5db',
                boxShadow: portalsEnabled
                  ? '0 4px 14px rgba(168, 85, 247, 0.3)'
                  : 'none',
              }}
            >
              🌀 Порталы
            </button>
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            width: `${canvasSize}px`,
            height: `${canvasSize}px`,
            border: '2px solid #4b5563',
            borderRadius: '8px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(16, 185, 129, 0.1)',
            touchAction: 'none',
            display: 'block',
          }}
        />

        {/* Overlays */}
        {gameState === 'idle' && (
          <div className="fade-in" style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🐍</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Змейка</h2>
            <p style={{ color: '#d1d5db', fontSize: '0.875rem', marginBottom: '8px', textAlign: 'center', padding: '0 16px' }}>
              Управление: стрелки / WASD / свайпы
            </p>
            <p style={{ color: '#a78bfa', fontSize: '0.75rem', marginBottom: '16px', textAlign: 'center', padding: '0 16px' }}>
              🌀 Порталы телепортируют змейку между собой
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
              }}
            >
              Начать игру
            </button>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '12px' }}>или нажмите Enter</p>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="fade-in" style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
            borderRadius: '8px',
          }}>
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
              }}
            >
              Продолжить
            </button>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '12px' }}>или нажмите Space</p>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="fade-in" style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
            borderRadius: '8px',
          }}>
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
              }}
            >
              Играть снова
            </button>
            <p style={{ color: '#6b7280', fontSize: '0.75rem', marginTop: '12px' }}>или нажмите R</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ width: '100%', maxWidth: `${canvasSize}px`, marginTop: '16px' }}>
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
              }}
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
              }}
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
              }}
            >
              <span>🔄</span> Заново
            </button>
          )}
        </div>

        {/* D-Pad for mobile */}
        <div className="dpad-mobile">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', width: '160px', margin: '0 auto' }}>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('UP'); }}
              onClick={() => handleDPad('UP')}
              className="dpad-btn"
            >
              ▲
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('LEFT'); }}
              onClick={() => handleDPad('LEFT')}
              className="dpad-btn"
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
            >
              ▶
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('DOWN'); }}
              onClick={() => handleDPad('DOWN')}
              className="dpad-btn"
            >
              ▼
            </button>
            <div />
          </div>
        </div>

        {/* Desktop hints */}
        <div className="desktop-hints">
          <span>← → ↑ ↓ — движение</span>
          <span>Space — пауза</span>
          <span>R — рестарт</span>
        </div>
      </div>

      <style>{`
        .dpad-btn {
          background: rgba(55, 65, 81, 0.8);
          border: none;
          border-radius: 8px;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
          cursor: pointer;
        }
        .dpad-btn:active {
          background: #16a34a;
        }
        .dpad-mobile {
          display: block;
        }
        .desktop-hints {
          display: none;
          justify-content: center;
          gap: 16px;
          color: #6b7280;
          font-size: 0.75rem;
          margin-top: 8px;
        }
        @media (min-width: 768px) {
          .dpad-mobile {
            display: none;
          }
          .desktop-hints {
            display: flex;
          }
        }
      `}</style>
    </div>
  );
}

export default App;
