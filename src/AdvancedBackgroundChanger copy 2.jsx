
import './App.css'


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

  useEffect(() => {
    const loadModel = async () => {
      try {
        selfieSegmentationRef.current = new selfieSegmentation.SelfieSegmentation({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
          }
        });
        selfieSegmentationRef.current.setOptions({
          modelSelection: 1,
          selfieMode: false,
        });
        console.log("%c Line:27 🥟 selfieSegmentationRef", "color:#b03734", selfieSegmentationRef);
        // await selfieSegmentationRef.current.initialize();
      } catch (err) {
        setError("Failed to load the segmentation model. Please try again later.");
        console.error("Error loading model:", err);
      }
    };
    loadModel();
  }, []);

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

      // if (video.readyState !== 4) {
      //   animationFrameId = requestAnimationFrame(processFrame);
      //   return;
      // }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      try {
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            await selfieSegmentationRef.current.send({ image: videoRef.current });
          },
          width: 1920,
          height: 1080,
        });
        camera.start();
        // await selfieSegmentationRef.current.send({image: video});
        // animationFrameId = requestAnimationFrame(processFrame);
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

    ctx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

    // Only overwrite existing pixels.
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    // Only overwrite missing pixels.
    ctx.globalCompositeOperation = 'destination-atop';
    if (backgroundImage) {
      ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
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
        img.onload = () => setBackgroundImage(img);
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

  return (
    <div className="advanced-background-changer">
      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
        <canvas ref={canvasRef} className="result-canvas" />
      </div>
      
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