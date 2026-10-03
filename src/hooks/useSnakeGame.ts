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
    const saved = localStorage.getItem('snake-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [eatenAnimation, setEatenAnimation] = useState<Position | null>(null);

  const directionRef = useRef<Direction>(direction);
  const gameStateRef = useRef<GameState>(gameState);
  const snakeRef = useRef<Position[]>(snake);
  const foodRef = useRef<Position>(food);
  const scoreRef = useRef<number>(score);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const directionQueueRef = useRef<Direction[]>([]);

  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  const stopLoop = useCallback(() => {
    if (intervalRef.current) {
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

    const currentSnake = [...snakeRef.current];
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
      stopLoop();
      if (scoreRef.current > (parseInt(localStorage.getItem('snake-high-score') || '0', 10))) {
        localStorage.setItem('snake-high-score', scoreRef.current.toString());
        setHighScore(scoreRef.current);
      }
      return;
    }

    // Check self collision
    if (currentSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
      setGameState('gameover');
      stopLoop();
      if (scoreRef.current > (parseInt(localStorage.getItem('snake-high-score') || '0', 10))) {
        localStorage.setItem('snake-high-score', scoreRef.current.toString());
        setHighScore(scoreRef.current);
      }
      return;
    }

    const newSnake = [head, ...currentSnake];
    const currentFood = foodRef.current;

    if (head.x === currentFood.x && head.y === currentFood.y) {
      // Ate food
      const newScore = scoreRef.current + (difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 20);
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
  }, [stopLoop, difficulty]);

  const startLoop = useCallback(() => {
    stopLoop();
    intervalRef.current = setInterval(gameLoop, SPEED_MAP[difficulty]);
  }, [gameLoop, stopLoop, difficulty]);

  const startGame = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    snakeRef.current = INITIAL_SNAKE;
    setFood({ x: 15, y: 10 });
    foodRef.current = { x: 15, y: 10 };
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    directionQueueRef.current = [];
    setScore(0);
    scoreRef.current = 0;
    setGameState('playing');
    gameStateRef.current = 'playing';
    setEatenAnimation(null);
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      startLoop();
    } else {
      stopLoop();
    }
    return stopLoop;
  }, [gameState, startLoop, stopLoop]);

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
    if (gameState === 'playing') {
      setGameState('paused');
      gameStateRef.current = 'paused';
    } else if (gameState === 'paused') {
      setGameState('playing');
      gameStateRef.current = 'playing';
    }
  }, [gameState]);

  const restartGame = useCallback(() => {
    stopLoop();
    startGame();
  }, [stopLoop, startGame]);

  const changeDifficulty = useCallback((d: Difficulty) => {
    setDifficulty(d);
    if (gameState === 'idle' || gameState === 'gameover') {
      // Just update, will apply on next start
    }
  }, [gameState]);

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
