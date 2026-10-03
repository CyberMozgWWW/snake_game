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
  const boardRef = useRef<HTMLDivElement>(null);

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

  // Touch controls
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

  // D-pad button handler
  const handleDPad = useCallback((dir: Direction) => {
    if (gameState === 'playing') {
      changeDirection(dir);
    }
  }, [gameState, changeDirection]);

  const cellSize = `calc(min(70vw, 70vh, 500px) / ${gridSize})`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex flex-col items-center justify-center p-4 select-none overflow-hidden">
      {/* Header */}
      <div className="w-full max-w-lg mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 mb-2">
          🐍 Змейка
        </h1>

        {/* Score Board */}
        <div className="flex justify-between items-center mb-3 px-2">
          <div className="flex gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Счёт</div>
              <div className="text-2xl font-bold text-white tabular-nums">{score}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Рекорд</div>
              <div className="text-2xl font-bold text-yellow-400 tabular-nums">{highScore}</div>
            </div>
          </div>
          <div className="flex gap-1">
            {(['easy', 'medium', 'hard'] as const).map(d => (
              <button
                key={d}
                onClick={() => changeDifficulty(d)}
                disabled={gameState === 'playing' || gameState === 'paused'}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  difficulty === d
                    ? d === 'easy'
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                      : d === 'medium'
                      ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/30'
                      : 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50'
                }`}
              >
                {d === 'easy' ? 'Легко' : d === 'medium' ? 'Средне' : 'Сложно'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div
        ref={boardRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="relative border-2 border-gray-600 rounded-lg overflow-hidden shadow-2xl shadow-green-900/20"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, ${cellSize})`,
          gridTemplateRows: `repeat(${gridSize}, ${cellSize})`,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        }}
      >
        {/* Grid pattern */}
        {Array.from({ length: gridSize * gridSize }).map((_, i) => {
          const x = i % gridSize;
          const y = Math.floor(i / gridSize);
          const isDark = (x + y) % 2 === 0;
          return (
            <div
              key={i}
              className={`${isDark ? 'bg-gray-800/30' : 'bg-gray-800/10'}`}
            />
          );
        })}

        {/* Snake */}
        {snake.map((segment, index) => (
          <div
            key={`snake-${index}`}
            className={`absolute rounded-sm transition-all duration-75 ${
              index === 0
                ? 'bg-gradient-to-br from-green-300 to-green-500 shadow-lg shadow-green-500/50 z-10'
                : 'bg-gradient-to-br from-green-400 to-green-600'
            }`}
            style={{
              left: `calc(${segment.x} * ${cellSize})`,
              top: `calc(${segment.y} * ${cellSize})`,
              width: cellSize,
              height: cellSize,
              opacity: index === 0 ? 1 : Math.max(0.6, 1 - index * 0.02),
              transform: index === 0 ? 'scale(1.1)' : 'scale(0.9)',
            }}
          >
            {index === 0 && (
              <div className="w-full h-full flex items-center justify-center text-[0.5em]">
                {getEyePosition(snake)}
              </div>
            )}
          </div>
        ))}

        {/* Food */}
        <div
          className="absolute animate-pulse z-10 flex items-center justify-center"
          style={{
            left: `calc(${food.x} * ${cellSize})`,
            top: `calc(${food.y} * ${cellSize})`,
            width: cellSize,
            height: cellSize,
          }}
        >
          <div className="w-[80%] h-[80%] rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/50 animate-bounce"
            style={{ animationDuration: '1s' }}
          />
        </div>

        {/* Eaten animation */}
        {eatenAnimation && (
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: `calc(${eatenAnimation.x} * ${cellSize})`,
              top: `calc(${eatenAnimation.y} * ${cellSize})`,
              width: cellSize,
              height: cellSize,
            }}
          >
            <div className="w-full h-full rounded-full bg-yellow-400/50 animate-ping" />
          </div>
        )}

        {/* Overlays */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-30 animate-fade-in">
            <div className="text-5xl mb-4">🐍</div>
            <h2 className="text-2xl font-bold text-white mb-2">Змейка</h2>
            <p className="text-gray-300 text-sm mb-4 text-center px-4">
              Управление: стрелки / WASD / свайпы
            </p>
            <button
              onClick={startGame}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 transition-all duration-200 active:scale-95"
            >
              Начать игру
            </button>
            <p className="text-gray-500 text-xs mt-3">или нажмите Enter</p>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-30 animate-fade-in">
            <div className="text-5xl mb-4">⏸️</div>
            <h2 className="text-2xl font-bold text-white mb-4">Пауза</h2>
            <button
              onClick={togglePause}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-full shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-200 active:scale-95"
            >
              Продолжить
            </button>
            <p className="text-gray-500 text-xs mt-3">или нажмите Space</p>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-30 animate-fade-in">
            <div className="text-5xl mb-4">💀</div>
            <h2 className="text-2xl font-bold text-white mb-1">Игра окончена</h2>
            <p className="text-3xl font-bold text-yellow-400 mb-1">{score}</p>
            <p className="text-gray-400 text-sm mb-4">
              {score >= highScore && score > 0 ? '🏆 Новый рекорд!' : `Рекорд: ${highScore}`}
            </p>
            <button
              onClick={restartGame}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-full shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 transition-all duration-200 active:scale-95"
            >
              Играть снова
            </button>
            <p className="text-gray-500 text-xs mt-3">или нажмите R</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg mt-4">
        {/* Action buttons */}
        <div className="flex justify-center gap-3 mb-4">
          {gameState === 'playing' && (
            <button
              onClick={togglePause}
              className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              <span>⏸</span> Пауза
            </button>
          )}
          {gameState === 'paused' && (
            <button
              onClick={togglePause}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              <span>▶</span> Продолжить
            </button>
          )}
          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              onClick={restartGame}
              className="px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              <span>🔄</span> Заново
            </button>
          )}
        </div>

        {/* D-Pad for mobile */}
        <div className="md:hidden flex justify-center">
          <div className="grid grid-cols-3 gap-1 w-40">
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('UP'); }}
              className="bg-gray-700/80 hover:bg-gray-600 active:bg-green-600 rounded-lg p-3 flex items-center justify-center text-white text-xl transition-colors"
            >
              ▲
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('LEFT'); }}
              className="bg-gray-700/80 hover:bg-gray-600 active:bg-green-600 rounded-lg p-3 flex items-center justify-center text-white text-xl transition-colors"
            >
              ◀
            </button>
            <div className="bg-gray-800/50 rounded-lg flex items-center justify-center text-gray-600">
              ●
            </div>
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('RIGHT'); }}
              className="bg-gray-700/80 hover:bg-gray-600 active:bg-green-600 rounded-lg p-3 flex items-center justify-center text-white text-xl transition-colors"
            >
              ▶
            </button>
            <div />
            <button
              onTouchStart={(e) => { e.preventDefault(); handleDPad('DOWN'); }}
              className="bg-gray-700/80 hover:bg-gray-600 active:bg-green-600 rounded-lg p-3 flex items-center justify-center text-white text-xl transition-colors"
            >
              ▼
            </button>
            <div />
          </div>
        </div>

        {/* Desktop hints */}
        <div className="hidden md:flex justify-center gap-4 text-gray-500 text-xs mt-2">
          <span>← → ↑ ↓ — движение</span>
          <span>Space — пауза</span>
          <span>R — рестарт</span>
        </div>
      </div>
    </div>
  );
}

function getEyePosition(snake: { x: number; y: number }[]): string {
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
}

export default App;
