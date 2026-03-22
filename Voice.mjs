import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import say from 'say';

const video = () => {
  const createAudioFiles = async (subtitles, outputFolder, callback) => {
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder);
    }

    const audioFiles = [];

    for (let i = 0; i < subtitles.length; i++) {
      const text = subtitles[i];
      const audioPath = path.join(outputFolder, `audio${i}.wav`);
      await new Promise((resolve, reject) => {
        say.export(text, null, 1.0, audioPath, (err) => {
          if (err) {
            console.error(`Error generating audio for subtitle "${text}":`, err);
            reject(err);
          } else {
            console.log(`Generated audio for subtitle: ${text}`);
            audioFiles.push({ path: audioPath });
            resolve();
          }
        });
      });
    }

    callback(audioFiles);
  };

  const getAudioDurations = async (audioFiles) => {
    const durations = [];

    for (const file of audioFiles) {
      const duration = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(file.path, (err, metadata) => {
          if (err) {
            console.error(`Error retrieving audio duration for file "${file.path}":`, err);
            reject(err);
          } else {
            const duration = metadata.format.duration;
            console.log(`Duration of ${file.path}: ${duration} seconds`);
            resolve(duration);
          }
        });
      });
      durations.push(duration);
    }

    return durations;
  };

  const createVideoSegments = async (inputFolder, outputFolder, subtitles, audioFiles, durations, callback) => {
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder);
    }

    const segmentPaths = [];
    
    for (let i = 0; i < subtitles.length; i++) {
      const imageFile = path.join(inputFolder, `image${i + 1}.png`);
      const audioFile = audioFiles[i].path;
      const duration = durations[i];
      const segmentPath = path.join(outputFolder, `segment${i}.mp4`);
      const subtitleText = subtitles[i];
      // const fontPath = process.platform === 'win32' ? 'C\\\\:/Windows/Fonts/arial.ttf' : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(imageFile)
          .loop(duration)
          .input(audioFile)
          .videoFilter(`drawtext=text='${subtitleText.replace(/'/g, "\\'")}':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=50`)
          .outputOptions([
            '-c:v libx264',
            '-pix_fmt yuv420p',
            '-c:a aac',
            '-shortest'
          ])
          .on('start', (command) => console.log(`FFmpeg command: ${command}`))
          .on('stderr', (stderr) => console.error(stderr))
          .on('end', () => {
            console.log(`Segment ${i + 1} created successfully`);
            segmentPaths.push(segmentPath);
            resolve();
          })
          .on('error', (err) => {
            console.error(`Error creating segment ${i + 1}:`, err);
            reject(err);
          })
          .save(segmentPath);
      });
    }

    callback(segmentPaths);
  };

  const concatenateVideoSegments = (segmentPaths, outputVideoPath, callback) => {
    const ffmpegCommand = ffmpeg();

    // Add all video segments as inputs
    segmentPaths.forEach((segment) => {
      ffmpegCommand.input(segment);
    });

    // Concatenate video segments
    ffmpegCommand
      .outputOptions('-filter_complex', `concat=n=${segmentPaths.length}:v=1:a=1[outv][outa]`)
      .outputOptions('-map', '[outv]', '-map', '[outa]')
      .on('start', (command) => console.log(`FFmpeg command: ${command}`))
      .on('error', (err) => console.error('Error concatenating video segments:', err))
      .on('end', () => {
        console.log('Video concatenation completed.');
        callback();
      })
      .save(outputVideoPath);
  };

  const inputFolder = 'public/downloads';
  const audioFolder = 'public/audio';
  const segmentFolder = 'public/segments';
  const outputVideoPath = 'public/output_video_with_subtitles_and_voice.mp4';
  const subtitles = [
    'A Black cat with yellow eyes',
    'is walking in the streets of city with cloudy weather',
    'but the cat comes from the forest',
    'Where there is an elephant',
    'A penguine',
    'and a sparrow',
  ];

  // Step 1: Generate audio files for subtitles
  createAudioFiles(subtitles, audioFolder, async (audioFiles) => {
    // Step 2: Measure durations of audio files
    const durations = await getAudioDurations(audioFiles);

    // Step 3: Create video segments for each subtitle and its corresponding audio
    createVideoSegments(inputFolder, segmentFolder, subtitles, audioFiles, durations, (segmentPaths) => {
      // Step 4: Concatenate video segments into the final video
      concatenateVideoSegments(segmentPaths, outputVideoPath, () => {
        console.log('Video created successfully with synced subtitles and audio.');
      });
    });
  });
};

video();
