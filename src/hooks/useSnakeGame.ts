import { useState, useCallback, useEffect, useRef } from 'react';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Position = { x: number; y: number };
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

const GRID_SIZE = 20;

const SPEED_MAP: Record<Difficulty, number> = {
  easy: 150,
  medium: 100,
  hard: 60,
};

function getRandomPosition(snake: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(seg => seg.x === pos.x && seg.y === pos.y));
  return pos;
}

export function useSnakeGame() {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      const saved = localStorage.getItem('snake-high-score');
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');

  // Game state refs (not React state to avoid re-renders)
  const snakeRef = useRef<Position[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const foodRef = useRef<Position>({ x: 15, y: 10 });
  const directionRef = useRef<Direction>('RIGHT');
  const scoreRef = useRef(0);
  const difficultyRef = useRef<Difficulty>('medium');
  const gameStateRef = useRef<GameState>('idle');
  const intervalRef = useRef<number | null>(null);
  const directionQueueRef = useRef<Direction[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Sync refs
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.width <= 0 || canvas.height <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;
    if (cellSize <= 0) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        const isDark = (x + y) % 2 === 0;
        ctx.fillStyle = isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(31, 41, 55, 0.1)';
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Draw food
    const food = foodRef.current;
    const foodX = food.x * cellSize + cellSize / 2;
    const foodY = food.y * cellSize + cellSize / 2;
    const foodRadius = cellSize * 0.35;

    ctx.save();
    ctx.shadowColor = 'rgba(239, 68, 68, 0.6)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(foodX, foodY, foodRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();
    ctx.restore();

    // Draw snake
    const snake = snakeRef.current;
    snake.forEach((segment, index) => {
      const x = segment.x * cellSize;
      const y = segment.y * cellSize;
      const size = cellSize * 0.9;
      const offset = (cellSize - size) / 2;

      if (index === 0) {
        // Head
        ctx.save();
        ctx.shadowColor = 'rgba(34, 197, 94, 0.5)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(x + offset, y + offset, size, size);
        ctx.restore();

        // Eyes
        const eyeSize = cellSize * 0.15;
        ctx.fillStyle = 'white';
        const dir = directionRef.current;
        let eye1X = x + cellSize * 0.3;
        let eye1Y = y + cellSize * 0.3;
        let eye2X = x + cellSize * 0.7;
        let eye2Y = y + cellSize * 0.3;

        if (dir === 'UP') {
          eye1Y = y + cellSize * 0.3;
          eye2Y = y + cellSize * 0.3;
        } else if (dir === 'DOWN') {
          eye1Y = y + cellSize * 0.7;
          eye2Y = y + cellSize * 0.7;
        } else if (dir === 'LEFT') {
          eye1X = x + cellSize * 0.3;
          eye2X = x + cellSize * 0.3;
          eye1Y = y + cellSize * 0.3;
          eye2Y = y + cellSize * 0.7;
        } else if (dir === 'RIGHT') {
          eye1X = x + cellSize * 0.7;
          eye2X = x + cellSize * 0.7;
          eye1Y = y + cellSize * 0.3;
          eye2Y = y + cellSize * 0.7;
        }

        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Body
        const opacity = Math.max(0.5, 1 - index * 0.02);
        ctx.fillStyle = `rgba(74, 222, 128, ${opacity})`;
        ctx.fillRect(x + offset, y + offset, size, size);
      }
    });
  }, []);

  const gameLoop = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    // Process direction queue
    if (directionQueueRef.current.length > 0) {
      const nextDir = directionQueueRef.current.shift()!;
      directionRef.current = nextDir;
    }

    const currentSnake = snakeRef.current;
    const head = { ...currentSnake[0] };
    const dir = directionRef.current;

    switch (dir) {
      case 'UP': head.y -= 1; break;
      case 'DOWN': head.y += 1; break;
      case 'LEFT': head.x -= 1; break;
      case 'RIGHT': head.x += 1; break;
    }

    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      setGameState('gameover');
      gameStateRef.current = 'gameover';
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      const currentScore = scoreRef.current;
      try {
        const savedHigh = parseInt(localStorage.getItem('snake-high-score') || '0', 10);
        if (currentScore > savedHigh) {
          localStorage.setItem('snake-high-score', currentScore.toString());
          setHighScore(currentScore);
        }
      } catch { /* ignore */ }
      return;
    }

    // Check self collision
    const bodyToCheck = currentSnake.slice(0, -1);
    if (bodyToCheck.some(seg => seg.x === head.x && seg.y === head.y)) {
      setGameState('gameover');
      gameStateRef.current = 'gameover';
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      const currentScore = scoreRef.current;
      try {
        const savedHigh = parseInt(localStorage.getItem('snake-high-score') || '0', 10);
        if (currentScore > savedHigh) {
          localStorage.setItem('snake-high-score', currentScore.toString());
          setHighScore(currentScore);
        }
      } catch { /* ignore */ }
      return;
    }

    const newSnake = [head, ...currentSnake];
    const currentFood = foodRef.current;

    if (head.x === currentFood.x && head.y === currentFood.y) {
      // Ate food
      const diff = difficultyRef.current;
      const points = diff === 'easy' ? 5 : diff === 'medium' ? 10 : 20;
      const newScore = scoreRef.current + points;
      setScore(newScore);
      scoreRef.current = newScore;
      const newFood = getRandomPosition(newSnake);
      foodRef.current = newFood;
    } else {
      newSnake.pop();
    }

    snakeRef.current = newSnake;
    draw();
  }, [draw]);

  const startLoop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
    const speed = SPEED_MAP[difficultyRef.current];
    intervalRef.current = window.setInterval(gameLoop, speed);
  }, [gameLoop]);

  useEffect(() => {
    if (gameState === 'playing') {
      startLoop();
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [gameState, startLoop]);

  // Initial draw
  useEffect(() => {
    draw();
  }, [draw]);

  const startGame = useCallback(() => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    snakeRef.current = initialSnake;
    foodRef.current = { x: 15, y: 10 };
    directionRef.current = 'RIGHT';
    directionQueueRef.current = [];
    setScore(0);
    scoreRef.current = 0;
    setGameState('playing');
    gameStateRef.current = 'playing';
    draw();
  }, [draw]);

  const changeDirection = useCallback((newDir: Direction) => {
    const current = directionQueueRef.current.length > 0
      ? directionQueueRef.current[directionQueueRef.current.length - 1]
      : directionRef.current;

    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT'
    };

    if (newDir !== opposites[current] && newDir !== current) {
      if (directionQueueRef.current.length < 2) {
        directionQueueRef.current.push(newDir);
      }
    }
  }, []);

  const togglePause = useCallback(() => {
    if (gameStateRef.current === 'playing') {
      setGameState('paused');
      gameStateRef.current = 'paused';
    } else if (gameStateRef.current === 'paused') {
      setGameState('playing');
      gameStateRef.current = 'playing';
    }
  }, []);

  const restartGame = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    startGame();
  }, [startGame]);

  const changeDifficulty = useCallback((d: Difficulty) => {
    setDifficulty(d);
    difficultyRef.current = d;
  }, []);

  return {
    canvasRef,
    gameState,
    score,
    highScore,
    difficulty,
    gridSize: GRID_SIZE,
    startGame,
    restartGame,
    togglePause,
    changeDirection,
    changeDifficulty,
    draw,
  };
}
