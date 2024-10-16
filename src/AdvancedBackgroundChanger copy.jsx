
import './App.css'


import React, { useRef, useState, useEffect } from 'react';
import * as selfieSegmentation from '@mediapipe/selfie_segmentation';


import { Camera } from "@mediapipe/camera_utils/camera_utils.js";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";


function AdvancedBackgroundChanger() {
  const inputVideoRef = useRef();
  const canvasRef = useRef();
  let ctx = null;

  const init = () => {
    const selfieSegmentation = new SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
    });

    ctx = canvasRef.current.getContext("2d");

    const constraints = {
      video: { width: { min: 1280 }, height: { min: 720 } },
    };
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      inputVideoRef.current.srcObject = stream;
      // sendToMediaPipe();
    });

    selfieSegmentation.setOptions({
      modelSelection: 1,
      selfieMode: true,
    });

    selfieSegmentation.onResults(onResults);

    const camera = new Camera(inputVideoRef.current, {
      onFrame: async () => {
        await selfieSegmentation.send({ image: inputVideoRef.current });
      },
      width: 1280,
      height: 720,
    });
    camera.start();
  };

  useEffect(() => {
    if (inputVideoRef.current) {
      init();
    }
  }, [inputVideoRef.current]);

  const onResults = (results) => {
    ctx.save();
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(
      results.segmentationMask,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    // Only overwrite existing pixels.
    // ctx.globalCompositeOperation = "source-out";
    // ctx.fillStyle = "#00FF00";
    // ctx.fillRect(
    //   0,
    //   0,
    //   canvasRef.current.width,
    //   canvasRef.current.height
    // );

    // Only overwrite missing pixels.
    // ctx.globalCompositeOperation = "destination-atop";
    ctx.globalCompositeOperation = "source-in";
    ctx.drawImage(
      results.image,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    ctx.restore();
  };

  return (
    <div className="App">
      <video autoPlay ref={inputVideoRef} width={1280} height={720} />
      <canvas ref={canvasRef} width={1280} height={720} />
    </div>
  );
}


export default AdvancedBackgroundChanger;