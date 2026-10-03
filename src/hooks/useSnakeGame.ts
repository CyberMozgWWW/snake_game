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

function getRandomPosition(exclude: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (exclude.some(seg => seg.x === pos.x && seg.y === pos.y));
  return pos;
}

function getRandomPositions(count: number, exclude: Position[]): Position[] {
  const positions: Position[] = [];
  const allExcluded = [...exclude];
  for (let i = 0; i < count; i++) {
    const pos = getRandomPosition(allExcluded);
    positions.push(pos);
    allExcluded.push(pos);
  }
  return positions;
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
  const [portalsEnabled, setPortalsEnabled] = useState(true);

  // Game state refs
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
  const portalsRef = useRef<[Position, Position] | null>(null);
  const portalsEnabledRef = useRef(true);
  const portalAnimationRef = useRef(0);
  const portalAnimFrameRef = useRef<number | null>(null);

  // Sync refs
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => { portalsEnabledRef.current = portalsEnabled; }, [portalsEnabled]);

  const drawPortals = useCallback((ctx: CanvasRenderingContext2D, cellSize: number) => {
    const portals = portalsRef.current;
    if (!portals || !portalsEnabledRef.current) return;

    const time = portalAnimationRef.current;

    portals.forEach((portal, index) => {
      const cx = portal.x * cellSize + cellSize / 2;
      const cy = portal.y * cellSize + cellSize / 2;
      const baseRadius = cellSize * 0.4;

      // Color schemes for each portal
      const colors = index === 0
        ? { outer: '#a855f7', inner: '#7c3aed', glow: 'rgba(168, 85, 247, 0.6)' }
        : { outer: '#f97316', inner: '#ea580c', glow: 'rgba(249, 115, 22, 0.6)' };

      // Pulsing effect
      const pulseScale = 1 + Math.sin(time * 3 + index * Math.PI) * 0.15;
      const radius = baseRadius * pulseScale;

      // Outer glow
      ctx.save();
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 15 + Math.sin(time * 2) * 5;

      // Draw swirling portal
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = colors.outer;
      ctx.fill();

      // Inner circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = colors.inner;
      ctx.fill();

      // Center bright spot
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();

      // Swirl lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const angle = time * 2 + (i * Math.PI * 2) / 3 + index * Math.PI;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.7, angle, angle + Math.PI * 0.5);
        ctx.stroke();
      }

      ctx.restore();
    });
  }, []);

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

    // Draw portals
    drawPortals(ctx, cellSize);

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
        const eyeSize = cellSize * 0.12;
        ctx.fillStyle = 'white';
        const dir = directionRef.current;
        let eye1X = x + cellSize * 0.35;
        let eye1Y = y + cellSize * 0.35;
        let eye2X = x + cellSize * 0.65;
        let eye2Y = y + cellSize * 0.35;

        if (dir === 'UP') {
          eye1Y = y + cellSize * 0.3;
          eye2Y = y + cellSize * 0.3;
        } else if (dir === 'DOWN') {
          eye1Y = y + cellSize * 0.7;
          eye2Y = y + cellSize * 0.7;
        } else if (dir === 'LEFT') {
          eye1X = x + cellSize * 0.3;
          eye2X = x + cellSize * 0.3;
          eye1Y = y + cellSize * 0.35;
          eye2Y = y + cellSize * 0.65;
        } else if (dir === 'RIGHT') {
          eye1X = x + cellSize * 0.7;
          eye2X = x + cellSize * 0.7;
          eye1Y = y + cellSize * 0.35;
          eye2Y = y + cellSize * 0.65;
        }

        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2X, eye2Y, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        // Pupils
        ctx.fillStyle = '#1a1a2e';
        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(eye2X, eye2Y, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Body
        const opacity = Math.max(0.5, 1 - index * 0.015);
        ctx.fillStyle = `rgba(74, 222, 128, ${opacity})`;
        ctx.fillRect(x + offset, y + offset, size, size);
      }
    });
  }, [drawPortals]);

  // Portal animation loop (runs continuously for smooth portal visuals)
  useEffect(() => {
    let running = true;
    const animate = () => {
      if (!running) return;
      portalAnimationRef.current += 0.05;
      draw();
      portalAnimFrameRef.current = requestAnimationFrame(animate);
    };
    portalAnimFrameRef.current = requestAnimationFrame(animate);
    return () => {
      running = false;
      if (portalAnimFrameRef.current !== null) {
        cancelAnimationFrame(portalAnimFrameRef.current);
      }
    };
  }, [draw]);

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

    // Check portal teleportation
    if (portalsEnabledRef.current && portalsRef.current) {
      const [portalA, portalB] = portalsRef.current;
      if (head.x === portalA.x && head.y === portalA.y) {
        // Teleport to portal B
        head.x = portalB.x;
        head.y = portalB.y;
        // Adjust direction to move away from portal B
      } else if (head.x === portalB.x && head.y === portalB.y) {
        // Teleport to portal A
        head.x = portalA.x;
        head.y = portalA.y;
      }
    }

    // Check self collision (skip tail since it will move)
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

      // Generate new food avoiding snake and portals
      const exclude = [...newSnake];
      if (portalsEnabledRef.current && portalsRef.current) {
        exclude.push(portalsRef.current[0], portalsRef.current[1]);
      }
      const newFood = getRandomPosition(exclude);
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

  const startGame = useCallback(() => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ];
    snakeRef.current = initialSnake;

    // Generate food and portals
    const exclude = [...initialSnake];
    const positions = getRandomPositions(3, exclude);
    foodRef.current = positions[0];

    if (portalsEnabledRef.current) {
      portalsRef.current = [positions[1], positions[2]];
    } else {
      portalsRef.current = null;
    }

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

  const togglePortals = useCallback(() => {
    setPortalsEnabled(prev => {
      const newVal = !prev;
      portalsEnabledRef.current = newVal;
      return newVal;
    });
  }, []);

  return {
    canvasRef,
    gameState,
    score,
    highScore,
    difficulty,
    portalsEnabled,
    gridSize: GRID_SIZE,
    startGame,
    restartGame,
    togglePause,
    changeDirection,
    changeDifficulty,
    togglePortals,
    draw,
  };
}
