import { useState } from "react";
import "./FloatingVideo.css";

const FloatingVideo = ({ videoUrl }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Extract video ID from YouTube URL
  const getVideoId = (url) => {
    if (!url) return "";
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : "";
  };

  const videoId = getVideoId(videoUrl);
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&loop=1&playlist=${videoId}`;

  if (!videoId) return null;

  return (
    <div className={`floating-video-container ${isMinimized ? "minimized" : ""} ${isExpanded ? "expanded" : ""}`}>
      {!isMinimized && (
        <div className="floating-video-header">
          <span className="floating-video-title">Rk Industries</span>
          <div className="floating-video-controls">
            <button
              className="floating-video-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? "Minimize" : "Expand"}
            >
              {isExpanded ? "−" : "+"}
            </button>
            <button
              className="floating-video-btn"
              onClick={() => setIsMinimized(true)}
              aria-label="Minimize"
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      {isMinimized ? (
        <button
          className="floating-video-minimized-btn"
          onClick={() => setIsMinimized(false)}
          aria-label="Show video"
        >
          ▶
        </button>
      ) : (
        <div className="floating-video-wrapper">
          <iframe
            src={embedUrl}
            title="Floating Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="floating-video-iframe"
          ></iframe>
        </div>
      )}
    </div>
  );
};

export default FloatingVideo;
