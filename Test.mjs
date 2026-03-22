// import ffmpeg from 'fluent-ffmpeg';
// import path from 'path';

// const inputPath = './images/'; // Path to the folder containing images
// const outputPath = './images/video.mp4'; // Output video file path

// ffmpeg()
//   .addInput(path.join(inputPath, '003.gif')) // Images named as 001.png, 002.png, etc.
//   .inputFPS(5) // Set the frame rate
//   .videoFilters('fade=in:0:10')
//   .videoFilters('pad=640:480:0:40:violet')
//   .on('end', () => {
//     console.log('Video created successfully');
//   })
//   .on('error', (err) => {
//     console.error('Error creating video:', err);
//   })
//   .save(outputPath);




// import fetch from 'node-fetch';

// const url = 'https://runwayml.p.rapidapi.com/generate/text';
// const options = {
//   method: 'POST',
//   headers: {
//     'x-rapidapi-key': 'c386701f65msh03a0d258526b978p1c767djsn97cd375ed13c',
//     'x-rapidapi-host': 'runwayml.p.rapidapi.com',
//     'Content-Type': 'application/json'
//   },
//   body: JSON.stringify({
//     text_prompt: 'masterpiece, cinematic, man smoking cigarette looking outside window, moving around',
//     model: 'gen3',
//     width: 1344,
//     height: 768,
//     motion: 5,
//     seed: 0,
//     upscale: true,
//     interpolate: true,
//     callback_url: ''
//   })
// };

// (async () => {
//   try {
//     const response = await fetch(url, options);
//     const result = await response.text();
//     console.log(result);
//   } catch (error) {
//     console.error(error);
//   }
// })();

import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

const video = () => {
  const createVideoWithSubtitles = (inputFolder, outputVideoPath, subtitles, frameRate = 5, outputFrameRate = 100) => {
    const inputPattern = path.join(inputFolder, 'image%d.png');
    const outputPath = path.resolve(outputVideoPath);

    const fontPath = process.platform === 'win32'
      ? 'C\\\\:/Windows/Fonts/arial.ttf'
      : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

    // Check input folder
    if (!fs.existsSync(inputFolder)) {
      console.error(`Input folder does not exist: ${inputFolder}`);
      return;
    }

    // Validate images
    if (!fs.existsSync(inputPattern.replace('%d', '1'))) {
      console.error(`No images found matching pattern: ${inputPattern}`);
      return;
    }

    const ffmpegCommand = ffmpeg()
      .addInput(inputPattern)
      .inputOptions([`-framerate ${frameRate}`])
      .on('start', (command) => console.log(`FFmpeg command: ${command}`)) // Log command
      .on('stderr', (stderr) => console.error(stderr)) // Log FFmpeg errors
      .on('end', () => console.log('Video created successfully'))
      .on('error', (err) => console.error('Error creating video:', err));

    const imageDuration = 1 / frameRate;
    let drawTextFilters = '';

    subtitles.forEach((text, index) => {
      const startTime = index * imageDuration;
      const endTime = (index + 1) * imageDuration;

      const textFilter = `drawtext=fontfile=${fontPath}:text='${text.replace(/'/g, "\\'")}': \
fontcolor=white:fontsize=34:x=(w-text_w)/2:y=50:enable='gte(t,${startTime.toFixed(2)})*lt(t,${endTime.toFixed(2)})'`;

      drawTextFilters += `${textFilter},`;
    });

    // Remove the trailing comma from filters
    drawTextFilters = drawTextFilters.slice(0, -1);

    ffmpegCommand
      .videoFilter(drawTextFilters)
      .outputOptions([`-r ${outputFrameRate}`, '-c:v libx264', '-pix_fmt yuv420p'])
      .save(outputPath);
  };

  const inputFolder = 'public/downloads';
  const outputVideoPath = 'public/output_video_with_subtitles.mp4';
  const subtitles = [
    'Scene 1 text',
    'Scene 2 text',
    'Scene 3 text',
    'Scene 4 text',
    'Scene 5 text',
    'Scene 6 text',

  ];

  createVideoWithSubtitles(inputFolder, outputVideoPath, subtitles);
};

video();

