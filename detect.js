"use strict";

const videoOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 256,
  scoreThreshold: 0.5,
});

const imageOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 512,
  scoreThreshold: 0.5,
});

const resizeCanvasAndResults = (dimensions, canvas, results) => {
  const { width, height } =
    dimensions instanceof HTMLVideoElement
      ? faceapi.getMediaDimensions(dimensions)
      : dimensions;
  canvas.width = width;
  canvas.height = height;

  return results?.map((res) => res.forSize(width, height));
};

const drawLandmarks = (dimensions, canvas, results, withBoxes = true) => {
  try {
    const resizedResults = resizeCanvasAndResults(dimensions, canvas, results);

    if (withBoxes) {
      faceapi.drawDetection(
        canvas,
        resizedResults?.map((det) => det.detection)
      );
    }

    const faceLandmarks = resizedResults?.map((det) => det.landmarks);
    const drawLandmarksOptions = {
      lineWidth: 1,
      drawLines: false,
      color: "green",
    };

    faceapi.drawLandmarks(canvas, faceLandmarks, drawLandmarksOptions);
  } catch (error) {
    handleError(error);
  }
};

const resetFileInput = () => {
  document.getElementById("files").value = null;
  document
    .getElementById("inputImage")
    .setAttribute("src", "./public/images/faces.jpg");
};

const handleFaceFounded = () => {
  document.getElementById("statusMessage").innerHTML = "Face was detected";
  document.getElementById("overlay").style.border = "4px dotted green";
  document.getElementById("overlayImage").style.border = "4px dotted green";
};

const handleFaceNotFounded = () => {
  const imageEl = document.getElementById("inputImage");

  drawLandmarks(imageEl, document.getElementById("overlayImage"), [], true);
  document.getElementById("statusMessage").innerHTML = "";
  document.getElementById("overlay").style.border = "4px dotted red";
  document.getElementById("overlayImage").style.border = "4px dotted red";
};

const handleError = (error) => {
  console.log(error);
  resetFileInput();
  run();
};

const loadImage = async () => {
  try {
    const imageEl = document.getElementById("inputImage");
    const videoEl = document.getElementById("inputVideo");

    const resultsFromImage = await faceapi
      .detectAllFaces(imageEl, imageOptions)
      .withFaceLandmarks(true)
      .withFaceDescriptors();

    if (resultsFromImage?.length > 0) {
      const result = await faceapi
        .detectSingleFace(videoEl, videoOptions)
        .withFaceLandmarks(true)
        .withFaceDescriptor();

      if (result?.descriptor) {
        const faceMatcher = new faceapi.FaceMatcher(resultsFromImage);
        const bestMatch = faceMatcher.findBestMatch(result.descriptor);

        if (bestMatch?.label) {
          const matchImages = resultsFromImage.filter((_item, index) => {
            return (
              (index + 1).toString() ===
              bestMatch?.label?.split("person")[1]?.trim()
            );
          });

          if (matchImages?.length > 0) {
            drawLandmarks(
              imageEl,
              document.getElementById("overlayImage"),
              matchImages,
              true
            );

            handleFaceFounded();
          } else {
            handleFaceNotFounded();
          }
        } else {
          handleFaceNotFounded();
        }
      } else {
        handleFaceNotFounded();
      }
    }

    setTimeout(() => loadImage(), 500);
  } catch (error) {
    handleError(error);
  }
};

const onPlay = async () => {
  try {
    const videoEl = document.getElementById("inputVideo");
    const result = await faceapi
      .detectSingleFace(videoEl, videoOptions)
      .withFaceLandmarks(true);

    if (result) {
      drawLandmarks(
        videoEl,
        document.getElementById("overlay"),
        [result],
        true
      );
    } else {
      drawLandmarks(videoEl, document.getElementById("overlay"), [], true);

      handleFaceNotFounded();
    }

    setTimeout(() => onPlay());
  } catch (error) {
    handleError(error);
  }
};

if (window.FileReader) {
  const handleFileSelect = (evt) => {
    const imageEl = document.getElementById("inputImage");
    const videoEl = document.getElementById("inputVideo");

    drawLandmarks(imageEl, document.getElementById("overlayImage"), [], true);
    drawLandmarks(videoEl, document.getElementById("overlay"), [], true);

    handleFaceNotFounded();

    const files = evt?.target?.files;
    const f = files[0];
    const reader = new FileReader();

    if (!reader || !f) return;
    if (f?.type !== "image/jpeg") {
      resetFileInput();
      return;
    }

    reader.onload = (() => (e) => {
      document
        .getElementById("inputImage")
        .setAttribute("src", e?.target?.result);
    })(f);

    reader?.readAsDataURL(f);
  };

  setTimeout(() => {
    const files = document.getElementById("files");

    if (files) {
      files.addEventListener("change", handleFileSelect, false);
    }
  });
} else {
  alert("This browser does not support FileReader");
}

const run = async () => {
  try {
    await faceapi.loadTinyFaceDetectorModel(
      "https://www.rocksetta.com/tensorflowjs/saved-models/face-api-js/"
    );
    await faceapi.loadFaceLandmarkTinyModel(
      "https://www.rocksetta.com/tensorflowjs/saved-models/face-api-js/"
    );
    await faceapi.loadFaceRecognitionModel(
      "https://www.rocksetta.com/tensorflowjs/saved-models/face-api-js/"
    );

    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    const videoEl = document.getElementById("inputVideo");

    videoEl.srcObject = stream;

    loadImage();
  } catch (error) {
    handleError(error);
  }
};

run();
