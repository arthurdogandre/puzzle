import React, { useState } from "react";
import { Upload, Play, Image as ImageIcon } from "lucide-react";
import { motion } from "motion/react";

interface Props {
  onStart: (image: string, difficulty: { rows: number; cols: number }) => void;
  initialDifficulty: { rows: number; cols: number };
}

const PRESET_IMAGES = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80",
];

export const PuzzleControls: React.FC<Props> = ({ onStart, initialDifficulty }) => {
  const [selectedImage, setSelectedImage] = useState<string>(PRESET_IMAGES[0]);
  const [targetPieces, setTargetPieces] = useState<number>(50);
  const [customPieces, setCustomPieces] = useState<string>("");
  const [customImage, setCustomImage] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setCustomImage(result);
        setSelectedImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateGrid = (count: number, imgUrl: string): { rows: number; cols: number; targetCount: number } => {
    // We'll estimate based on a standard 4:3 if image isn't loaded yet,
    // but in a real scenario we'd await the image dimensions.
    // For now, we'll use a fixed calculation or just square-ish.
    const rows = Math.round(Math.sqrt(count / 1.33));
    const cols = Math.round(count / rows);
    return { rows, cols, targetCount: count };
  };

  const currentImage = customImage || selectedImage;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/10 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl w-full max-w-5xl text-stone-900 ring-1 ring-white/5 flex flex-col md:flex-row gap-10 items-center"
    >
      <div className="flex-1 w-full space-y-6">
        <div>
          <h2 className="font-serif text-5xl italic font-normal tracking-tight mb-1 text-[#fcfcfc]">
            Welcome to the world of Andre and Kelly
          </h2>
        </div>

        {/* Preview */}
        <div className="aspect-[16/10] w-full rounded-[2rem] overflow-hidden border-8 border-white shadow-inner bg-stone-100 relative">
          <img src={currentImage} className="w-full h-full object-cover" alt="Preview" />
          <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-[2rem]"></div>
        </div>
      </div>

      <div className="w-full md:w-[320px] space-y-8 flex flex-col justify-center border-t md:border-t-0 md:border-l border-stone-100 pt-8 md:pt-0 md:pl-10">
        {/* Difficulty Selection */}
        <div>
          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-4 block">
            Target Pieces
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[50, 100, 150, 200, 250].map((count) => (
              <button
                key={count}
                onClick={() => {
                  setTargetPieces(count);
                  setCustomPieces("");
                }}
                className={`py-2 px-3 rounded-xl font-bold border text-sm transition-all duration-300 ${
                  targetPieces === count && !customPieces
                    ? "bg-natural-primary text-white border-natural-primary shadow-lg shadow-natural-primary/20"
                    : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100"
                }`}
              >
                {count}
              </button>
            ))}
            <div className="relative">
              <input
                type="number"
                placeholder="Custom"
                value={customPieces}
                onChange={(e) => {
                  setCustomPieces(e.target.value);
                  setTargetPieces(parseInt(e.target.value) || 50);
                }}
                className={`w-full py-2 px-3 rounded-xl font-bold border text-sm text-center transition-all duration-300 outline-none ${
                  customPieces 
                    ? "bg-natural-primary text-white border-natural-primary placeholder:text-white/50" 
                    : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Image Selection */}
        <div>
          <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-4 block">
            Artwork Catalog
          </label>
          <div className="flex gap-3 items-center flex-wrap">
            {PRESET_IMAGES.map((img, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedImage(img);
                  setCustomImage(null);
                }}
                className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all duration-500 ${
                  selectedImage === img && !customImage
                    ? "border-natural-primary scale-110 shadow-md"
                    : "border-transparent opacity-40 hover:opacity-100"
                }`}
              >
                <img src={img} className="w-full h-full object-cover" alt={`Preset ${i}`} />
              </button>
            ))}
            <label className="w-12 h-12 rounded-xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:border-natural-primary hover:bg-stone-50 transition-all bg-stone-50 group">
              <Upload className="w-4 h-4 text-stone-400 group-hover:text-natural-primary" />
              <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*" />
            </label>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => onStart(currentImage, calculateGrid(targetPieces, currentImage))}
            className="w-full py-4 bg-natural-primary text-white rounded-xl font-bold text-base hover:bg-natural-primary/95 transition-all flex items-center justify-center gap-3 shadow-xl shadow-natural-primary/20 active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-current" />
            Assemble
          </button>
        </div>
      </div>
    </motion.div>
  );
};
