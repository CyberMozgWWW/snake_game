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

const INITIAL_SNAKE: Position[] = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 },
];

export function useSnakeGame() {
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>({ x: 15, y: 10 });
  const [direction, setDirection] = useState<Direction>('RIGHT');
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
  const [eatenAnimation, setEatenAnimation] = useState<Position | null>(null);

  // Use refs for game loop to avoid stale closures and infinite re-renders
  const directionRef = useRef<Direction>('RIGHT');
  const gameStateRef = useRef<GameState>('idle');
  const snakeRef = useRef<Position[]>(INITIAL_SNAKE);
  const foodRef = useRef<Position>({ x: 15, y: 10 });
  const scoreRef = useRef<number>(0);
  const difficultyRef = useRef<Difficulty>('medium');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const directionQueueRef = useRef<Direction[]>([]);

  // Sync refs with state
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);

  const stopLoop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const gameLoop = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    // Process direction queue
    if (directionQueueRef.current.length > 0) {
      const nextDir = directionQueueRef.current.shift()!;
      directionRef.current = nextDir;
      setDirection(nextDir);
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
      setEatenAnimation({ ...currentFood });
      setTimeout(() => setEatenAnimation(null), 400);
      const newFood = getRandomPosition(newSnake);
      setFood(newFood);
      foodRef.current = newFood;
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
    snakeRef.current = newSnake;
  }, []);

  const startLoop = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
    }
    const speed = SPEED_MAP[difficultyRef.current];
    intervalRef.current = setInterval(gameLoop, speed);
  }, [gameLoop]);

  // Start/stop loop based on game state
  useEffect(() => {
    if (gameState === 'playing') {
      startLoop();
    } else {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    // Cleanup on unmount
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
    setSnake(initialSnake);
    snakeRef.current = initialSnake;
    setFood({ x: 15, y: 10 });
    foodRef.current = { x: 15, y: 10 };
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    directionQueueRef.current = [];
    setScore(0);
    scoreRef.current = 0;
    setEatenAnimation(null);
    setGameState('playing');
    gameStateRef.current = 'playing';
  }, []);

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
    snake,
    food,
    direction,
    gameState,
    score,
    highScore,
    difficulty,
    gridSize: GRID_SIZE,
    eatenAnimation,
    startGame,
    restartGame,
    togglePause,
    changeDirection,
    changeDifficulty,
  };
}
