/***** PIXEL FEED  *****/

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const downloadLink = document.getElementById('downloadLink');

// size of each pixel block
let pixelSize = 3;
// size of the gap between pixels
let gapSize = 3;
// contrast factor
let contrast = 2;


/***** Handle Video Recording *****/

// set up for media recording
let mediaRecorder;
let recordedChunks = [];

// create an off-screen video element to capture the stream
const video = document.createElement('video');
video.style.display = 'none'; // hide the video element
document.body.appendChild(video);

// access video cam
navigator.mediaDevices.getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
    // start video stream
    video.play();

    // create a MediaStream from the canvas
    const canvasStream = canvas.captureStream(30); // 30 fps

    // set up MediaRecorder
    mediaRecorder = new MediaRecorder(canvasStream);

    // if data is available from the video feed, add it to the array
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    // when recording stops, process recorded data and create downloadable file
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      downloadLink.href = url;
      downloadLink.download = 'pixelated-recording.webm';
      downloadLink.style.display = 'block';
    };
  })
  .catch((err) => {
    console.error('Error accessing webcam:', err);
  });

// handle record button click
recordButton.addEventListener('click', () => {
  if (mediaRecorder) {
    recordedChunks = []; // clear previous recordings
    mediaRecorder.start();
    recordButton.disabled = true;
    stopButton.disabled = false;
  }
});

// handle stop recording button click
stopButton.addEventListener('click', () => {
  if (mediaRecorder) {
    mediaRecorder.stop();
    recordButton.disabled = false;
    stopButton.disabled = true;
  }
});

/***** Handle Video Pixelation/Visual Processing *****/

/* creates and sizes the off-screen canvas to process video data before rendering
it to main canvas */
function createSmallCanvas() {
  // create off-screen canvas
  const smallCanvas = document.createElement('canvas');

  // calculate the effective size for the pixelated video so it fits properly
  const effectiveWidth = canvas.width / (pixelSize + gapSize);
  const effectiveHeight = canvas.height / (pixelSize + gapSize);

  // set width and height to effective dimensions
  smallCanvas.width = Math.floor(effectiveWidth);
  smallCanvas.height = Math.floor(effectiveHeight);

  return smallCanvas;
}

/* helper function draws the video on the small canvas, captures video frame
at reduced size for processing */
function drawVideoOnSmallCanvas(smallCanvas) {
  const smallContext = smallCanvas.getContext('2d');
  smallContext.drawImage(video, 0, 0, smallCanvas.width, smallCanvas.height);
}

/* helper function gets pixel data from small canvas video */
function getImageData(smallCanvas) {
  const smallContext = smallCanvas.getContext('2d');
  return smallContext.getImageData(0, 0, smallCanvas.width, smallCanvas.height);
}

/* helper function clears main canvas to prepare it for new pixelated drawing */
function clearMainCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

/* helper function that converts to grayscale */
function convertToGrayscale(r, g, b) {
  return (r + g + b) / 3;
}

/* helper function that adjusts contrast of pixels */
function adjustContrast(grayscale){
  // apply contrast adjustment
  grayscale = 128 + (grayscale - 128) * contrast;
  return Math.max(0, Math.min(255, grayscale)); // clamp between 0 and 255
}

/* helper function to draw a circle */
function drawCircle(ctx, centerX, centerY, radius) {
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}

/* helper function handles processing pixels of video image
(grayscale, contrast, rounded pixels) */
function drawPixelatedImage(data, smallCanvas) {
  // loop through each pixel in small canvas
  for (let y = 0; y < smallCanvas.height; y++) {
    for (let x = 0; x < smallCanvas.width; x++) {
      // calculate position in data array for each pixel's RGBA values
      const index = (y * smallCanvas.width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];

      let grayscale = convertToGrayscale(r, g, b);
      grayscale = adjustContrast(grayscale);

      // set fill color to adjusted grayscale
      context.fillStyle = `rgba(${grayscale}, ${grayscale}, ${grayscale}, 1)`;

      // draw a circle for each pixel
      drawCircle(
        context,
        x * (pixelSize + gapSize),
        y * (pixelSize + gapSize),
        pixelSize / 2
      );
    }
  }
}

/* draws/applies pixelated filter to video feed */
function applyPixelatedFilter() {

  const smallCanvas = createSmallCanvas();
  drawVideoOnSmallCanvas(smallCanvas);

  const imageData = getImageData(smallCanvas);

  // array of RGBA values for each pixel
  const data = imageData.data;

  clearMainCanvas();
  drawPixelatedImage(data, smallCanvas);

}

/* conductor function creates continuous update of canvas for real-time
video processing */
function drawToCanvas() {
  // Set canvas size to the desired dimensions (e.g., 640x480)
  canvas.width = 640;
  canvas.height = 480;

  applyPixelatedFilter();

  requestAnimationFrame(drawToCanvas);
}

// on play, set conductor function in motion
video.addEventListener('play', () => {
  drawToCanvas();
});
