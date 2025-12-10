import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useGetMazeChaseGame } from "@/api/maze-chase/useGetMazeChaseGame";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";

const GodotGame = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: gameData, isLoading } = useGetMazeChaseGame(id || "");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentScore, setCurrentScore] = useState(0);
  const [gameReady, setGameReady] = useState(false);

  // Send game data to Godot when iframe loads and game data is ready
  useEffect(() => {
    if (!gameData || !iframeRef.current || !gameReady) return;

    const sendGameData = () => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;

      // Format data untuk Godot
      const godotGameData = {
        type: "GAME_DATA",
        payload: {
          id: gameData.id,
          name: gameData.name,
          description: gameData.description,
          scorePerQuestion: gameData.score_per_question,
          mapId: gameData.map_id,
          countdown: gameData.countdown,
          questions:
            gameData.questions?.map((q) => ({
              questionText: q.question_text,
              questionIndex: q.question_index,
              answers:
                q.answers?.map((a) => ({
                  answerText: a.answer_text,
                  answerIndex: a.answer_index,
                })) || [],
            })) || [],
        },
      };

      console.log("Sending game data to Godot:", godotGameData);
      iframe.contentWindow.postMessage(godotGameData, "*");
    };

    // Delay sedikit untuk memastikan Godot sudah siap
    const timer = setTimeout(sendGameData, 1000);
    return () => clearTimeout(timer);
  }, [gameData, gameReady]);

  // Listen for messages from Godot
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Pastikan message dari iframe kita
      if (event.source !== iframeRef.current?.contentWindow) return;

      const { type, payload } = event.data;

      switch (type) {
        case "GODOT_READY":
          console.log("Godot engine is ready");
          setGameReady(true);
          break;

        case "ANSWER_SUBMITTED":
          console.log("Answer submitted:", payload);
          // payload: { questionIndex, answerIndex, isCorrect }
          if (payload.isCorrect) {
            setCurrentScore(
              (prev) => prev + (gameData?.score_per_question || 10),
            );
          }
          break;

        case "GAME_COMPLETED":
          console.log("Game completed with score:", payload.score);
          // Bisa navigate ke halaman hasil atau tampilkan dialog
          break;

        case "REQUEST_NEXT_QUESTION":
          console.log("Godot requesting next question:", payload.questionIndex);
          // Godot meminta pertanyaan berikutnya
          break;

        default:
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [gameData]);

  // Handle iframe load
  const handleIframeLoad = () => {
    console.log("Iframe loaded");
    // Game akan mengirim GODOT_READY ketika engine sudah siap
  };

  const toggleFullscreen = () => {
    if (!iframeRef.current) return;

    if (!document.fullscreenElement) {
      iframeRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
        })
        .catch((err) => {
          console.error("Error attempting to enable fullscreen:", err);
        });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  if (!gameData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Game not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-white font-semibold text-lg">
                {gameData.name || "Maze Chase Game"}
              </h1>
              {gameData.description && (
                <p className="text-gray-400 text-sm">{gameData.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-white font-semibold">
              Score: <span className="text-green-400">{currentScore}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleFullscreen}
              className="text-white hover:bg-gray-700"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 mr-2" />
              ) : (
                <Maximize2 className="w-4 h-4 mr-2" />
              )}
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </Button>
          </div>
        </div>
      </div>

      {/* Game Container */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl relative">
          {!gameReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
              <div className="text-white text-xl">Loading game engine...</div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src="/game/index.html"
            className="w-full h-full border-0"
            title="Godot Game"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={handleIframeLoad}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
        <div className="max-w-7xl mx-auto text-center text-gray-400 text-sm">
          <p>Use arrow keys or WASD to move. Press ESC to pause.</p>
        </div>
      </div>
    </div>
  );
};

export default GodotGame;
