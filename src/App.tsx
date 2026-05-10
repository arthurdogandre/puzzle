import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { io, Socket } from "socket.io-client";
import { PuzzleBoard } from "./components/PuzzleBoard";
import { PuzzleControls } from "./components/PuzzleControls";
import { PuzzlePiece, Difficulty } from "./types";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { Howl } from "howler";

const snapSound = new Howl({
  src: ["https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3"],
});

const solveSound = new Howl({
  src: ["https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3"],
});

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty>({ rows: 3, cols: 3, targetCount: 9 });
  const [bgColor, setBgColor] = useState("#F2F0E9");
  const [isStarted, setIsStarted] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<string | null>(null);
  const [showRemaining, setShowRemaining] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const id = hash || null;
    setRoomId(id);

    const newSocket = io();
    setSocket(newSocket);

    if (id) {
      newSocket.emit("join-room", id);
    }

    newSocket.on("initial-state", (state) => {
      setImage(state.image);
      setPieces(state.pieces);
      setDifficulty(state.difficulty);
      setBgColor(state.backgroundColor || "#F2F0E9");
      setIsStarted(true);
    });

    newSocket.on("piece-updated", ({ pieceId, x, y, isPlaced }) => {
      setPieces((prev) =>
        prev.map((p) =>
          p.id === pieceId ? { ...p, x, y, isPlaced } : p
        )
      );
    });

    newSocket.on("bg-changed", (color) => {
      setBgColor(color);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const createRoom = () => {
    const newId = uuidv4();
    window.location.hash = newId;
    setRoomId(newId);
    if (socket) {
      socket.emit("join-room", newId);
    }
  };

  const handleStart = (imgData: string, diff: { rows: number; cols: number; targetCount: number }) => {
    const newPieces = generatePieces(imgData, diff);
    setImage(imgData);
    setDifficulty(diff);
    setPieces(newPieces);
    setIsStarted(true);
    setIsSolved(false);
    setStartTime(Date.now());
    setTotalTime(null);

    if (socket && roomId) {
      socket.emit("init-puzzle", {
        roomId,
        state: {
          image: imgData,
          pieces: newPieces,
          difficulty: diff,
          backgroundColor: bgColor,
        },
      });
    }
  };

  const handlePieceMove = (pieceId: string, x: number, y: number, isPlaced: boolean) => {
    setPieces((prev) => {
      const updated = prev.map((p) => (p.id === pieceId ? { ...p, x, y, isPlaced } : p));
      
      if (isPlaced && !prev.find(p => p.id === pieceId)?.isPlaced) {
        snapSound.play();
      }

      if (updated.length > 0 && updated.every((p) => p.isPlaced)) {
        setIsSolved(true);
        if (startTime) {
          const duration = Date.now() - startTime;
          const mins = Math.floor(duration / 60000);
          const secs = Math.floor((duration % 60000) / 1000);
          setTotalTime(`${mins}:${secs.toString().padStart(2, '0')}`);
        }
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
        });
        solveSound.play();
      } else {
        setIsSolved(false);
      }
      
      return updated;
    });

    if (socket && roomId) {
      socket.emit("update-piece", { roomId, pieceId, x, y, isPlaced });
    }
  };

  const handleBgChange = (color: string) => {
    setBgColor(color);
    if (socket && roomId) {
      socket.emit("change-bg", { roomId, color });
    }
  };

  const PASTEL_COLORS = [
    "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9", "#BAE1FF", 
    "#E0BBE4", "#FFC6FF", "#BDB2FF", "#A0C4FF", "#CAFFBF"
  ];

  return (
    <div
      className="h-screen transition-colors duration-500 overflow-hidden font-sans"
      style={{ backgroundColor: bgColor }}
    >
      <main 
        className={`w-full h-full flex flex-col items-center relative p-0 ${isStarted ? 'overflow-hidden' : 'overflow-y-auto'}`}
        style={{ backgroundColor: isStarted ? bgColor : undefined }}
      >
        <header className="absolute top-16 right-8 pointer-events-none z-30">
          <div className="flex items-center gap-4 pointer-events-auto">
            {isStarted && (
              <div className="flex space-x-4 bg-white/80 backdrop-blur-xl px-4 py-2 rounded-full shadow-2xl border border-white ring-1 ring-black/5 items-center">
                <div className="flex gap-1 border-r border-stone-200 pr-4 mr-2">
                  {PASTEL_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => handleBgChange(color)}
                      className={`w-5 h-5 rounded-full border transition-transform hover:scale-125 active:scale-95 ${
                        bgColor === color ? "border-stone-800 scale-110" : "border-white"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                  }}
                  className="text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:text-stone-900 transition-colors px-3 py-1.5 border-r border-stone-200"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => setIsStarted(false)}
                  className="text-[10px] font-bold uppercase tracking-widest text-stone-600 hover:text-red-500 transition-colors px-3 py-1.5"
                >
                  Return to Lobby
                </button>
              </div>
            )}
          </div>
        </header>

        <div className="w-full h-full flex flex-col items-center justify-center">
          {!isStarted ? (
            <div 
              className="w-full h-full flex flex-col items-center justify-center relative bg-stone-950"
              style={{ backgroundColor: "#000000" }}
            >
              {/* Background Illustration / Image */}
              <div 
                className="absolute inset-0 z-0"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1503256207526-0d5d80fa2f47?q=80&w=1920&auto=format&fit=crop')",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.4
                }}
              />
              <div className="w-full max-w-5xl pb-12 px-4 z-10">
                <PuzzleControls onStart={handleStart} initialDifficulty={difficulty} />
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="relative group/board w-full h-full flex-1">
                <PuzzleBoard
                  image={image!}
                  pieces={pieces}
                  difficulty={difficulty}
                  onPieceMove={handlePieceMove}
                  showHints={showRemaining}
                  backgroundColor={bgColor}
                />
                
                <AnimatePresence>
                  {isSolved && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-auto z-50 bg-stone-900/40 backdrop-blur-md"
                    >
                      <div className="bg-white p-16 rounded-[40px] shadow-2xl text-center border border-white/20">
                        <motion.h2 
                          initial={{ y: 20 }}
                          animate={{ y: 0 }}
                          className="font-serif text-8xl italic text-stone-800 leading-none"
                        >
                          Bravo.
                        </motion.h2>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="mt-8 space-y-2"
                        >
                          <p className="uppercase tracking-[0.4em] text-[10px] text-stone-400 font-bold">
                            Completion Time
                          </p>
                          <p className="text-4xl font-mono text-stone-800 tracking-tighter">
                            {totalTime || "--:--"}
                          </p>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                          className="mt-12"
                        >
                          <button
                            onClick={() => setIsStarted(false)}
                            className="bg-stone-900 text-white px-10 py-4 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-stone-800 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
                          >
                            Return to Editor
                          </button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="h-16 flex items-center justify-center">
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">
                  Drag pieces to the target area • Scroll to Zoom • Drag background to Pan
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function generatePieces(imgUrl: string, diff: { rows: number; cols: number }): PuzzlePiece[] {
  const pieces: PuzzlePiece[] = [];
  const hConnects = Array.from({ length: diff.rows }, () => 
    Array.from({ length: diff.cols - 1 }, () => (Math.random() > 0.5 ? 1 : -1))
  );
  const vConnects = Array.from({ length: diff.rows - 1 }, () => 
    Array.from({ length: diff.cols }, () => (Math.random() > 0.5 ? 1 : -1))
  );

  // Dynamic slot sizing: slightly larger than pieces for clear layout
  const pieceW = 800 / diff.cols;
  const pieceH = 600 / diff.rows;
  const slotSize = Math.max(pieceW, pieceH) * 1.4;
  
  const scaleFactor = 2; 
  const wsW = 800 * scaleFactor;
  const wsH = 600 * scaleFactor;

  // Safety margins within the workspace (boardX/boardY relative to photo 0,0)
  // workspace bounds relative to photo:
  const wsMinX = (800 - wsW) / 2 + 30;
  const wsMaxX = (800 + wsW) / 2 - slotSize - 30;
  const wsMinY = (600 - wsH) / 2 + 30;
  const wsMaxY = (600 + wsH) / 2 - slotSize - 30;

  const validSlots: {x: number, y: number}[] = [];
  
  // Fill the workspace with a grid of potential slots
  for (let sy = wsMinY; sy <= wsMaxY; sy += slotSize) {
    for (let sx = wsMinX; sx <= wsMaxX; sx += slotSize) {
      // Exclude photo area with margin: photo is [0, 800] x [0, 600]
      const inPhoto = sx > -100 && sx < 800 + 100 - slotSize && 
                      sy > -100 && sy < 600 + 100 - slotSize;
      
      if (!inPhoto) {
        validSlots.push({ x: sx, y: sy });
      }
    }
  }

  // Shuffle pieces to slots randomly, but slots stay in orderly grid
  const shuffledSlots = [...validSlots];
  for (let i = shuffledSlots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledSlots[i], shuffledSlots[j]] = [shuffledSlots[j], shuffledSlots[i]];
  }

  let slotIdx = 0;
  for (let r = 0; r < diff.rows; r++) {
    for (let c = 0; c < diff.cols; c++) {
      const slot = shuffledSlots[slotIdx % shuffledSlots.length];
      slotIdx++;
      
      pieces.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        x: slot.x,
        y: slot.y,
        isPlaced: false,
        top: r === 0 ? 0 : -vConnects[r - 1][c],
        bottom: r === diff.rows - 1 ? 0 : vConnects[r][c],
        left: c === 0 ? 0 : -hConnects[r][c - 1],
        right: c === diff.cols - 1 ? 0 : hConnects[r][c],
      });
    }
  }
  return pieces;
}
