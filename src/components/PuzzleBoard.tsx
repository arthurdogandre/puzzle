import React, { useEffect, useState, useRef } from "react";
import { Stage, Layer, Shape, Rect, Group } from "react-konva";
import useImage from "use-image";
import { PuzzlePiece, Difficulty } from "../types";

interface Props {
  image: string;
  pieces: PuzzlePiece[];
  difficulty: Difficulty;
  onPieceMove: (id: string, x: number, y: number, isPlaced: boolean) => void;
  showHints: boolean;
  backgroundColor: string;
}

export const PuzzleBoard: React.FC<Props> = ({
  image,
  pieces,
  difficulty,
  onPieceMove,
  showHints,
  backgroundColor,
}) => {
  const [img] = useImage(image);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(0.7); // Zoomed out by default to see pieces
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [workspaceSize, setWorkspaceSize] = useState({ width: 2000, height: 1500 });
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
        
        // Center the stage on load
        setStagePos({
          x: (width - workspaceSize.width * scale) / 2,
          y: (height - workspaceSize.height * scale) / 2
        });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [scale, workspaceSize]);

  useEffect(() => {
    if (img) {
      const ratio = img.width / img.height;
      let w = 800; // Standard photo size on workspace
      let h = w / ratio;
      if (h > 550) {
        h = 550;
        w = h * ratio;
      }
      setDimensions({ width: w, height: h });
      
      // Calculate dynamic workspace (approx 2x dimensions of photo)
      const scaleFactor = 2;
      setWorkspaceSize({
        width: w * scaleFactor,
        height: h * scaleFactor
      });
    }
  }, [img]);

  const pieceWidth = dimensions.width / difficulty.cols;
  const pieceHeight = dimensions.height / difficulty.rows;

  const handleDragEnd = (id: string, x: number, y: number) => {
    const piece = pieces.find((p) => p.id === id);
    if (!piece || piece.isPlaced) return;

    const targetX = piece.col * pieceWidth;
    const targetY = piece.row * pieceHeight;

    const distance = Math.sqrt(Math.pow(x - targetX, 2) + Math.pow(y - targetY, 2));

    const tolerance = 50;
    if (distance < tolerance) {
      onPieceMove(id, targetX, targetY, true);
    } else {
      onPieceMove(id, x, y, false);
    }
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const scaleBy = 1.05;
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const finalScale = Math.max(0.2, Math.min(newScale, 5));
    setScale(finalScale);

    setStagePos({
      x: pointer.x - mousePointTo.x * finalScale,
      y: pointer.y - mousePointTo.y * finalScale,
    });
  };

  if (!img) return <div className="text-stone-400 animate-pulse font-serif italic text-2xl">Preparing Canvas...</div>;

  const boardX = (workspaceSize.width - dimensions.width) / 2;
  const boardY = (workspaceSize.height - dimensions.height) / 2;

  return (
    <div 
      ref={containerRef}
      className="w-full h-full flex items-center justify-center overflow-hidden relative group"
      style={{ backgroundColor: backgroundColor }}
    >
      <Stage 
        width={containerSize.width} 
        height={containerSize.height}
        ref={stageRef}
        onWheel={handleWheel}
        draggable={true}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={scale}
        scaleY={scale}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        <Layer>
          {/* Workspace Boundary */}
          <Rect
            x={0}
            y={0}
            width={workspaceSize.width}
            height={workspaceSize.height}
            stroke="#000000"
            strokeWidth={8}
            dash={[30, 15]}
            opacity={0.3}
          />
          <Rect
            x={0}
            y={0}
            width={workspaceSize.width}
            height={workspaceSize.height}
            fill="white"
            opacity={0.04}
          />

          {/* Guidelines Group */}
          <Group x={boardX} y={boardY}>
            <Rect
              width={dimensions.width}
              height={dimensions.height}
              stroke="#000000"
              strokeWidth={5}
              opacity={0.4}
              fill="rgba(0,0,0,0.03)"
            />

            {showHints &&
              pieces.map((p) => (
                <Rect
                  key={`hint-${p.id}`}
                  x={p.col * pieceWidth}
                  y={p.row * pieceHeight}
                  width={pieceWidth}
                  height={pieceHeight}
                  stroke="rgba(0,0,0,0.05)"
                  strokeWidth={1}
                />
              ))}

            {pieces.filter((p) => p.isPlaced).map((p) => (
              <PuzzlePieceItem
                key={p.id}
                piece={p}
                img={img}
                pieceWidth={pieceWidth}
                pieceHeight={pieceHeight}
                imgDimensions={{ width: img.width, height: img.height }}
                boardDimensions={dimensions}
                onDragEnd={handleDragEnd}
                isDraggable={false}
                offsetX={0}
                offsetY={0}
              />
            ))}
          </Group>

          {/* Unplaced pieces */}
          {pieces.filter((p) => !p.isPlaced).map((p) => (
            <PuzzlePieceItem
              key={p.id}
              piece={p}
              img={img}
              pieceWidth={pieceWidth}
              pieceHeight={pieceHeight}
              imgDimensions={{ width: img.width, height: img.height }}
              boardDimensions={dimensions}
              onDragEnd={handleDragEnd}
              isDraggable={true}
              offsetX={boardX}
              offsetY={boardY}
            />
          ))}
        </Layer>
      </Stage>
      
      <div className="absolute bottom-12 right-12 text-[10px] uppercase font-bold tracking-[0.3em] text-stone-400 bg-white/40 backdrop-blur-md px-6 py-2 rounded-full border border-white opacity-0 group-hover:opacity-100 transition-opacity">
        Zoom: Scroll • Pan: Drag Stage
      </div>
    </div>
  );
};

interface PieceProps {
  piece: PuzzlePiece;
  img: HTMLImageElement;
  pieceWidth: number;
  pieceHeight: number;
  imgDimensions: { width: number; height: number };
  boardDimensions: { width: number; height: number };
  onDragEnd: (id: string, x: number, y: number) => void;
  isDraggable: boolean;
  offsetX: number;
  offsetY: number;
}

const PuzzlePieceItem: React.FC<PieceProps> = ({
  piece,
  img,
  pieceWidth,
  pieceHeight,
  imgDimensions,
  boardDimensions,
  onDragEnd,
  isDraggable,
  offsetX,
  offsetY,
}) => {
  const drawPieceShape = (context: any, shape: any) => {
    const w = pieceWidth;
    const h = pieceHeight;
    const r = 4; // Corner radius for soften edges
    
    // Tighter, softer knobs
    const tabSize = Math.min(w, h) * 0.16;
    const neckSize = tabSize * 0.4;
    
    context.beginPath();
    context.moveTo(r, 0);

    // Top
    if (piece.top !== 0) {
      const dir = piece.top;
      context.lineTo(w * 0.5 - neckSize, 0);
      context.bezierCurveTo(w * 0.5 - neckSize, -tabSize * dir * 0.2, w * 0.5 - tabSize, -tabSize * dir, w * 0.5 - tabSize, -tabSize * dir * 1.15);
      context.arc(w * 0.5, -tabSize * dir * 1.15, tabSize * 0.5, Math.PI, 0, dir < 0);
      context.bezierCurveTo(w * 0.5 + tabSize, -tabSize * dir, w * 0.5 + neckSize, -tabSize * dir * 0.2, w * 0.5 + neckSize, 0);
    }
    context.lineTo(w - r, 0);
    context.quadraticCurveTo(w, 0, w, r);

    // Right
    if (piece.right !== 0) {
      const dir = piece.right;
      context.lineTo(w, h * 0.5 - neckSize);
      context.bezierCurveTo(w + tabSize * dir * 0.2, h * 0.5 - neckSize, w + tabSize * dir, h * 0.5 - tabSize, w + tabSize * dir * 1.15, h * 0.5 - tabSize);
      context.arc(w + tabSize * dir * 1.15, h * 0.5, tabSize * 0.5, -Math.PI / 2, Math.PI / 2, dir < 0);
      context.bezierCurveTo(w + tabSize * dir, h * 0.5 + tabSize, w + tabSize * dir * 0.2, h * 0.5 + neckSize, w, h * 0.5 + neckSize);
    }
    context.lineTo(w, h - r);
    context.quadraticCurveTo(w, h, w - r, h);

    // Bottom
    if (piece.bottom !== 0) {
      const dir = piece.bottom;
      context.lineTo(w * 0.5 + neckSize, h);
      context.bezierCurveTo(w * 0.5 + neckSize, h + tabSize * dir * 0.2, w * 0.5 + tabSize, h + tabSize * dir, w * 0.5 + tabSize, h + tabSize * dir * 1.15);
      context.arc(w * 0.5, h + tabSize * dir * 1.15, tabSize * 0.5, 0, Math.PI, dir < 0);
      context.bezierCurveTo(w * 0.5 - tabSize, h + tabSize * dir, w * 0.5 - neckSize, h + tabSize * dir * 0.2, w * 0.5 - neckSize, h);
    }
    context.lineTo(r, h);
    context.quadraticCurveTo(0, h, 0, h - r);

    // Left
    if (piece.left !== 0) {
      const dir = piece.left;
      context.lineTo(0, h * 0.5 + neckSize);
      context.bezierCurveTo(-tabSize * dir * 0.2, h * 0.5 + neckSize, -tabSize * dir, h * 0.5 + tabSize, -tabSize * dir * 1.15, h * 0.5 + tabSize);
      context.arc(-tabSize * dir * 1.15, h * 0.5, tabSize * 0.5, Math.PI / 2, -Math.PI / 2, dir < 0);
      context.bezierCurveTo(-tabSize * dir, h * 0.5 - tabSize, -tabSize * dir * 0.2, h * 0.5 - neckSize, 0, h * 0.5 - neckSize);
    }
    context.lineTo(0, r);
    context.quadraticCurveTo(0, 0, r, 0);

    context.closePath();
    context.fillShape(shape);
  };

  return (
    <Shape
      x={piece.x + offsetX}
      y={piece.y + offsetY}
      draggable={isDraggable}
      onDragEnd={(e) => {
        onDragEnd(piece.id, e.target.x() - offsetX, e.target.y() - offsetY);
      }}
      onDragStart={(e) => {
        if (isDraggable) e.target.moveToTop();
      }}
      sceneFunc={drawPieceShape}
      fillPatternImage={img}
      fillPatternScale={{
        x: boardDimensions.width / imgDimensions.width,
        y: boardDimensions.height / imgDimensions.height,
      }}
      fillPatternOffset={{
        x: (piece.col * imgDimensions.width) / (boardDimensions.width / pieceWidth),
        y: (piece.row * imgDimensions.height) / (boardDimensions.height / pieceHeight),
      }}
      shadowColor="rgba(0, 0, 0, 0.4)"
      shadowBlur={piece.isPlaced ? 0 : 15}
      shadowOpacity={piece.isPlaced ? 0 : 0.6}
      shadowOffset={{ x: 2, y: 2 }}
    />
  );
};
