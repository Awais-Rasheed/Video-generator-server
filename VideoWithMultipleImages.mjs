import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import say from 'say';

const video = () => {
  const createAudioFiles = async (subtitles, outputFolder, callback) => {
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
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

  const createVideoSegments = async (inputFolders, outputFolder, subtitles, audioFiles, durations, callback) => {
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }
  
    const segmentPaths = [];
  
    for (let i = 0; i < subtitles.length; i++) {
      const folder = inputFolders[i];
      const images = fs.readdirSync(folder).filter(file => file.endsWith('.png') || file.endsWith('.jpg'));
      const audioFile = path.resolve(audioFiles[i].path).replace(/\\/g, '/');
      const duration = durations[i];
      const segmentPath = path.join(outputFolder, `segment${i}.mp4`);
      const subtitleText = subtitles[i];
      const frameDuration = duration / images.length;
  
      // Check if images are available
      if (images.length === 0) {
        console.error(`No images found in folder ${folder} for segment ${i + 1}`);
        continue;
      }
  
      // Create images.txt file for this segment
      const imageListPath = path.resolve(folder, 'images.txt').replace(/\\/g, '/');
      let fileContent = images.map(image => {
        const imagePath = path.resolve(folder, image).replace(/\\/g, '/');
        return `file '${imagePath}'\nduration ${frameDuration}`;
      }).join('\n');
      // Append the final image without duration
      const lastImagePath = path.resolve(folder, images[images.length - 1]).replace(/\\/g, '/');
      fileContent += `\nfile '${lastImagePath}'`;
  
      // Output the images.txt content for debugging
      console.log(`images.txt content for segment ${i + 1}:\n${fileContent}`);
  
      fs.writeFileSync(imageListPath, fileContent);
      
      const fontPath = process.platform === 'win32' 
      ? 'C\\\\:/Windows/Fonts/arial.ttf'
      : '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

      const wrapText = (text, maxLength) => {
        const words = text.split(' ');
        let lines = [];
        let line = '';
      
        words.forEach(word => {
          if ((line + word).length <= maxLength) {
            line += (line ? ' ' : '') + word;
          } else {
            lines.push(line);
            line = word;
          }
        });
        lines.push(line);
        return lines.join('\\n'); // FFmpeg requires `\n` to be double-escaped (`\\n`)
      };
      
      // Modify your subtitle text:
      const wrappedSubtitle = wrapText(subtitleText, 20);

      
      await new Promise((resolve, reject) => {
        ffmpeg()
          .input(imageListPath)
          .inputOptions(['-f', 'concat', '-safe', '0'])
          .input(audioFile)
          .complexFilter([
            `[0:v]scale=trunc(iw/2)*2:-2[v]`, // Ensure width is even
            `[v]drawtext=fontfile=${fontPath}:text='${wrappedSubtitle}':fontcolor=white:fontsize=10:x=(w-text_w)/2:y=50`
          ])
          
          .outputOptions([
            '-c:v', 'libx264',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-shortest'
          ])
          .on('start', (command) => {
            console.log(`FFmpeg command for segment ${i + 1}: ${command}`);
          })
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
  
      // Clean up the images.txt file
      fs.unlinkSync(imageListPath);
    }
  
    callback(segmentPaths);
  };
  
  const concatenateVideoSegments = (segmentPaths, outputVideoPath, callback) => {
    // Ensure output directory exists
    const outputDir = path.dirname(outputVideoPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  
    const tempFile = path.resolve(outputDir, 'concat_list.txt').replace(/\\/g, '/');
  
    // Verify segment paths and ensure they exist
    segmentPaths.forEach((segmentPath, index) => {
      const resolvedPath = path.resolve(segmentPath).replace(/\\/g, '/');
      if (!fs.existsSync(resolvedPath)) {
        console.error(`Segment file does not exist: ${resolvedPath}`);
      } else {
        console.log(`Segment ${index + 1} path: ${resolvedPath}`);
      }
    });
  
    const fileContent = segmentPaths
      .map(p => `file '${path.resolve(p).replace(/\\/g, '/')}'`)
      .join('\n');
  
    fs.writeFileSync(tempFile, fileContent);
  
    // Verify that concat_list.txt was created
    if (fs.existsSync(tempFile)) {
      console.log(`concat_list.txt successfully created at ${tempFile}`);
      console.log(`concat_list.txt content:\n${fileContent}`);
    } else {
      console.error(`Failed to create concat_list.txt at ${tempFile}`);
    }
  
    ffmpeg()
      .input(tempFile)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .outputOptions(['-c', 'copy'])
      .on('start', (command) => {
        console.log(`FFmpeg command for concatenation: ${command}`);
      })
      .on('stderr', (stderrLine) => {
        console.error(`FFmpeg stderr: ${stderrLine}`);
      })
      .on('end', () => {
        console.log('Video concatenation completed.');
        // Optionally, remove the tempFile after concatenation
        fs.unlinkSync(tempFile);
        callback();
      })
      .on('error', (err, stdout, stderr) => {
        console.error('Error concatenating video segments:', err);
        console.error(`FFmpeg stderr: ${stderr}`);
      })
      .save(path.resolve(outputVideoPath).replace(/\\/g, '/'));
  };
  

  const inputFolders = [
    'public/downloads/scene1',
    'public/downloads/scene2',
    'public/downloads/scene3',
  ];
  const audioFolder = 'public/audio';
  const segmentFolder = 'public/segments';
  const outputVideoPath = 'public/output_video_with_subtitles_and_voice.mp4';
  const subtitles = [
    'Surfing is a surface water sport in which an individual, a surfer (or two in tandem surfing), uses a board to ride on the forward section, or face, of a moving wave of water, which usually carries the surfer towards the shore.',
    'Rugby is a team sport where each player can really go all out. Rugby is a 15-a-side team sport. The object of the game is to ground the ball behind the opponents try line, into what is called the in-goal area. Rugby is played both with the ball in hand and by kicking the ball.',
    'Dog fighting is a type of blood sport that turns game and fighting dogs against each other in a physical fight',
  ];

  // Step 1: Generate audio files for subtitles
  createAudioFiles(subtitles, audioFolder, async (audioFiles) => {
    // Step 2: Measure durations of audio files
    const durations = await getAudioDurations(audioFiles);

    // Step 3: Create video segments for each subtitle and its corresponding audio
    createVideoSegments(inputFolders, segmentFolder, subtitles, audioFiles, durations, (segmentPaths) => {
      // Step 4: Concatenate video segments into the final video
      concatenateVideoSegments(segmentPaths, outputVideoPath, () => {
        console.log('Video created successfully with synced subtitles and audio.');
      });
    });
  });
};

video();
