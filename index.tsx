import React, { useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";

// Platform options mapping to aspect ratios
const PLATFORMS = [
  { id: "story", name: "Instagram/Facebook Story", ratio: "9:16", icon: "fa-instagram" },
  { id: "feed", name: "Social Media Feed", ratio: "1:1", icon: "fa-square-share-nodes" },
  { id: "landscape", name: "Google Display / Web", ratio: "16:9", icon: "fa-google" },
];

const App = () => {
  const [apiKey, setApiKey] = useState(process.env.API_KEY || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fileToGenerativePart = async (file: File) => {
    return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        resolve({
          inlineData: {
            data: base64String,
            mimeType: file.type,
          },
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const generateAd = async () => {
    if (!imageFile || !title) {
      setError("Please provide a book cover and a title.");
      return;
    }
    if (!apiKey) {
      setError("API Key is missing.");
      return;
    }

    setLoading(true);
    setError("");
    setGeneratedImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const imagePart = await fileToGenerativePart(imageFile);

      // Prompt engineering for high-quality ad generation
      const prompt = `Create a stunning, high-quality static advertisement image optimized for ${platform.name}. 
      
      Subject:
      The centerpiece is the provided book cover for a book titled "${title}".
      
      Context & Vibe:
      ${description ? `The ad should convey this message/vibe: ${description}.` : "The vibe should be serene, professional, and inspiring, suitable for a high-quality journal or planner."}
      
      Composition:
      - Place the book naturally in a lifestyle setting (e.g., on a minimalist wooden desk with coffee, in a cozy reading nook, or held by a person in a soft-focus background).
      - The lighting should be soft, golden-hour, or studio quality.
      - Make it look like a premium social media ad for the brand 'Innerflue'.
      - Do not add text overlays, just the visual photography.
      - Ensure the book cover provided is clearly visible and integrated realistically (lighting, shadows, perspective).`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            imagePart,
            { text: prompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: platform.ratio as any,
          }
        }
      });

      // Extract image from response
      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64String = part.inlineData.data;
            setGeneratedImage(`data:image/png;base64,${base64String}`);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error("No image generated. The model might have returned text instead.");
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate ad. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-stone-800 tracking-tight mb-2">innerflue</h1>
        <p className="text-stone-500 text-lg font-light tracking-wide">
          AI-Powered Ad Creator for KDP Authors
        </p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Left Column: Controls */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-100 h-fit">
          <div className="space-y-6">
            
            {/* 1. Upload */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                1. Upload Book Cover
              </label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative cursor-pointer group 
                  border-2 border-dashed rounded-2xl p-8 
                  transition-all duration-300 ease-in-out
                  ${imagePreview ? 'border-stone-300 bg-stone-50' : 'border-stone-300 hover:border-stone-400 hover:bg-stone-50'}
                `}
              >
                 <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                
                {imagePreview ? (
                  <div className="relative flex justify-center">
                     <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-64 object-contain rounded-lg shadow-lg" 
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-lg flex items-center justify-center">
                      <p className="opacity-0 group-hover:opacity-100 text-white font-medium bg-black bg-opacity-50 px-3 py-1 rounded-full text-sm">Change Image</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <i className="fa-solid fa-cloud-arrow-up text-4xl text-stone-300 mb-3 group-hover:text-stone-400 transition-colors"></i>
                    <p className="text-sm text-stone-500 font-medium">Click to upload cover image</p>
                    <p className="text-xs text-stone-400 mt-1">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  2. Book Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. The Mindfulness Journal"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-500 focus:ring-0 outline-none transition-all bg-stone-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  3. Description / Hook
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the vibe or hook (e.g., 'A cozy morning companion for self-reflection')"
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-stone-500 focus:ring-0 outline-none transition-all bg-stone-50 resize-none"
                />
              </div>
            </div>

            {/* 3. Platform */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">
                4. Select Platform
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p)}
                    className={`
                      flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200
                      ${platform.id === p.id 
                        ? 'bg-stone-800 text-white border-stone-800 shadow-md transform scale-[1.02]' 
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50'}
                    `}
                  >
                    <i className={`fa-brands ${p.icon} text-xl mb-2`}></i>
                    <span className="text-xs font-medium">{p.ratio}</span>
                    <span className="text-[10px] opacity-80 mt-1">{p.id}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateAd}
              disabled={loading || !imageFile}
              className={`
                w-full py-4 rounded-xl text-white font-medium text-lg shadow-lg
                flex items-center justify-center gap-2 transition-all duration-300
                ${loading || !imageFile 
                  ? 'bg-stone-300 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-stone-700 to-stone-900 hover:from-stone-800 hover:to-black hover:shadow-xl transform hover:-translate-y-0.5'}
              `}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i>
                  <span>Creating Magic...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-wand-magic-sparkles"></i>
                  <span>Generate Ad Creative</span>
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-start gap-2">
                <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="flex flex-col h-full">
           <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-100 h-full flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden">
              
              {!generatedImage && !loading && (
                <div className="text-center text-stone-400">
                  <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-regular fa-image text-3xl"></i>
                  </div>
                  <p className="text-lg font-medium text-stone-500">Ad Preview</p>
                  <p className="text-sm">Your generated ad will appear here</p>
                </div>
              )}

              {loading && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-90 z-10">
                    <div className="w-16 h-16 border-4 border-stone-200 border-t-stone-800 rounded-full animate-spin mb-4"></div>
                    <p className="text-stone-600 font-medium animate-pulse">Analyzing cover...</p>
                 </div>
              )}

              {generatedImage && (
                <div className="relative w-full h-full flex flex-col items-center">
                  <img 
                    src={generatedImage} 
                    alt="Generated Ad" 
                    className="max-w-full max-h-[600px] object-contain rounded-lg shadow-2xl"
                  />
                  
                  <div className="mt-6 flex gap-4 w-full justify-center">
                    <a 
                      href={generatedImage} 
                      download={`innerflue-ad-${title.replace(/\s+/g, '-').toLowerCase()}.png`}
                      className="px-6 py-3 bg-stone-800 text-white rounded-full font-medium text-sm hover:bg-stone-900 transition-colors shadow-lg flex items-center gap-2"
                    >
                      <i className="fa-solid fa-download"></i>
                      Download
                    </a>
                    <button 
                      onClick={() => setGeneratedImage(null)}
                      className="px-6 py-3 bg-white text-stone-600 border border-stone-200 rounded-full font-medium text-sm hover:bg-stone-50 transition-colors flex items-center gap-2"
                    >
                      <i className="fa-solid fa-rotate-right"></i>
                      Reset
                    </button>
                  </div>
                </div>
              )}
           </div>
        </div>

      </div>
      
      <div className="mt-12 text-center text-stone-400 text-xs">
        <p>Powered by Gemini Nano Banana (Flash 2.5) • Optimized for Innerflue</p>
      </div>

    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
