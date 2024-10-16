import React, { useRef, useState, useEffect } from 'react';
import * as selfieSegmentation from '@mediapipe/selfie_segmentation';
import { Camera } from "@mediapipe/camera_utils/camera_utils.js";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

const AdvancedBackgroundChanger = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const selfieSegmentationRef = useRef(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [error, setError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [segmentationConfig, setSegmentationConfig] = useState({
    modelSelection: 1,
    selfieMode: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  useEffect(() => {
    const loadModel = async () => {
      try {
        selfieSegmentationRef.current = new selfieSegmentation.SelfieSegmentation({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
          }
        });

        selfieSegmentationRef.current.setOptions({
          ...segmentationConfig,
          enableBackgroundBlur: true,
          backgroundBlurStrength: 3,
        });

        await selfieSegmentationRef.current.initialize();
      } catch (err) {
        setError("Failed to load the segmentation model. Please try again later.");
        console.error("Error loading model:", err);
      }
    };
    loadModel();
  }, [segmentationConfig]);

  useEffect(() => {
    let animationFrameId;

    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: { exact: 1280 }, height: { exact: 720 } } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setIsWebcamActive(true);
            setIsVideoReady(true);
          };
        }
      } catch (err) {
        setError("Failed to access the webcam. Please make sure it's connected and you've granted permission.");
        console.error("Error accessing the webcam:", err);
      }
    };

    const processFrame = async () => {
      if (!selfieSegmentationRef.current || !isWebcamActive || !isVideoReady) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      try {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            await selfieSegmentationRef.current.send({ image: videoRef.current });
          },
          width: 1280,
          height: 720,
        });
        camera.start();
      } catch (err) {
        setError("An error occurred while processing the video. Please try again.");
        console.error("Error processing frame:", err);
      }
    };

    if (isWebcamActive && isVideoReady) {
      selfieSegmentationRef.current.onResults(onResults);
      processFrame();
    } else if (isWebcamActive) {
      startWebcam();
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [isWebcamActive, isVideoReady, backgroundImage]);

  const onResults = (results) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw and enhance the segmentation mask
    ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

    // Apply edge smoothing
    ctx.filter = 'blur(1px)';
    
    // Only overwrite existing pixels
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    // Reset filter for background
    ctx.filter = 'none';
    
    // Only overwrite missing pixels
    ctx.globalCompositeOperation = 'destination-atop';
    
    if (backgroundImage) {
      // Apply subtle background blur for depth effect
      ctx.filter = 'blur(2px)';
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
      
      // Add subtle vignette effect
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
      );
      gradient.addColorStop(0, 'rgba(0,0,0,0)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.3)');
      
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.restore();
  };

  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Ensure background image matches canvas dimensions
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          
          // Set to match video dimensions
          tempCanvas.width = videoRef.current.videoWidth;
          tempCanvas.height = videoRef.current.videoHeight;
          
          // Draw and resize background image maintaining aspect ratio
          const scale = Math.max(
            tempCanvas.width / img.width,
            tempCanvas.height / img.height
          );
          
          const x = (tempCanvas.width - img.width * scale) / 2;
          const y = (tempCanvas.height - img.height * scale) / 2;
          
          tempCtx.drawImage(
            img,
            x, y,
            img.width * scale,
            img.height * scale
          );
          
          const processedImg = new Image();
          processedImg.src = tempCanvas.toDataURL();
          setBackgroundImage(processedImg);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWebcamToggle = () => {
    setIsWebcamActive(prev => !prev);
    setIsVideoReady(false);
    setError(null);
  };

  const captureImage = () => {
    if (canvasRef.current) {
      const capturedImageData = canvasRef.current.toDataURL('image/jpeg', 1.0);
      setCapturedImage(capturedImageData);
    }
  };

  const QualityControls = () => (
    <div className="quality-controls">
      <select
        value={segmentationConfig.modelSelection}
        onChange={(e) => setSegmentationConfig(prev => ({
          ...prev,
          modelSelection: parseInt(e.target.value)
        }))}
      >
        <option value={1}>High Quality (Slower)</option>
        <option value={0}>Fast Performance</option>
      </select>
      
      <input
        type="range"
        min="0.1"
        max="0.9"
        step="0.1"
        value={segmentationConfig.minDetectionConfidence}
        onChange={(e) => setSegmentationConfig(prev => ({
          ...prev,
          minDetectionConfidence: parseFloat(e.target.value)
        }))}
      />
      <label>Detection Confidence: {segmentationConfig.minDetectionConfidence}</label>
    </div>
  );

  return (
    <div className="advanced-background-changer">
      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
        <canvas ref={canvasRef} className="result-canvas" />
      </div>
      
      <QualityControls />
      
      <div className="button-container">
        <button onClick={handleWebcamToggle} className="button webcam-button">
          {isWebcamActive ? 'Stop Webcam' : 'Use Webcam'}
        </button>

        <input
          type="file"
          accept="image/*"
          onChange={handleBackgroundUpload}
          className="file-input"
          id="background-upload"
          disabled={!isWebcamActive || !isVideoReady}
        />
        <label htmlFor="background-upload" className={`button background-button ${(!isWebcamActive || !isVideoReady) ? 'disabled' : ''}`}>
          Choose Background
        </label>

        <button onClick={captureImage} className="button capture-button" disabled={!isWebcamActive || !isVideoReady}>
          Capture Image
        </button>
      </div>
      
      {error && <p className="error-text">{error}</p>}
      
      {capturedImage && (
        <div className="captured-image-container">
          <h3>Captured Image:</h3>
          <img src={capturedImage} alt="Captured" className="captured-image" />
        </div>
      )}
    </div>
  );
};

export default AdvancedBackgroundChanger;