// src/utils/videoCreator.js
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import say from "say";
import { sendProgressToClients } from '../utils/sse.mjs';

const video = async (imagePaths, subtitles, prompt = "video", callback, progressCallback,  options = {}) => {
  // Add default value for prompt and handle undefined case
  const { enableZoomPan = false, script = "" } = options;

  const sanitizedPrompt = (prompt || "video")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();

  const audioFolder = path.resolve("public/audio");
  const segmentFolder = path.resolve("public/segments");
  const outputVideoPath = path.resolve(
    `public/${sanitizedPrompt}_${Date.now()}.mp4`
  );

  [audioFolder, segmentFolder].forEach((folder) => {
    if (!fs.existsSync(folder)) {
      try {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`✅ Created directory: ${folder}`);
      } catch (err) {
        console.error(`❌ Failed to create directory ${folder}:`, err);
      }
    }
  });

  // Create unique temporary directory for this video creation process
  const uniqueId = Date.now();
  const tempSegmentFolder = path.resolve(`public/segments/temp_${uniqueId}`);
  const tempAudioFolder = path.resolve(`public/audio/temp_${uniqueId}`);

  try {
    fs.mkdirSync(tempSegmentFolder, { recursive: true });
    fs.mkdirSync(tempAudioFolder, { recursive: true });
    console.log(`✅ Created temporary directories for this video generation`);
  } catch (err) {
    console.error(`❌ Failed to create temporary directories:`, err);
    return;
  }

  // Enhanced function to convert file path to frontend URL
  const getImageUrl = (imagePath) => {
    try {
      // Handle both absolute and relative paths
      let imageUrl;
      
      if (path.isAbsolute(imagePath)) {
        // Convert absolute path to relative URL
        const publicPath = path.resolve("public");
        if (imagePath.startsWith(publicPath)) {
          imageUrl = imagePath.replace(publicPath, "");
        } else {
          // If image is outside public folder, copy it or handle differently
          imageUrl = imagePath.replace(path.resolve("."), "");
        }
      } else {
        // Handle relative paths
        imageUrl = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      }
      
      // Ensure URL starts with forward slash for frontend
      return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    } catch (error) {
      console.error(`❌ Error converting image path to URL: ${imagePath}`, error);
      return imagePath;
    }
  };

  // Send initial progress with all image URLs
  sendProgressToClients('process_started', {
    message: 'Video creation process started',
    totalImages: imagePaths.length,
    totalSubtitles: subtitles.length,
    imageUrls: imagePaths.map((imgPath, index) => ({
      index,
      url: getImageUrl(imgPath),
      originalPath: imgPath
    }))
  });

  // Validate image paths and send each image URL to frontend
  const validatedImagePaths = [];
  const imageUrls = [];
  
  for (let i = 0; i < imagePaths.length; i++) {
    const imgPath = imagePaths[i];
    
    // Check if image file exists
    if (!fs.existsSync(imgPath)) {
      console.error(`❌ Image file not found: ${imgPath}`);
      sendProgressToClients('error', {
        message: `Image file not found: ${imgPath}`,
        step: 'image_validation',
        imageIndex: i
      });
      continue;
    }
    
    // Convert to frontend URL
    const frontendUrl = getImageUrl(imgPath);
    
    validatedImagePaths.push(imgPath);
    imageUrls.push({
      index: i,
      url: frontendUrl,
      originalPath: imgPath,
      exists: true
    });
    
    // Send each image URL to frontend as it's being processed
    sendProgressToClients('image_processed', {
      imageUrl: frontendUrl,
      originalPath: imgPath,
      index: i,
      total: imagePaths.length,
      message: `Image ${i + 1} of ${imagePaths.length} processed and URL sent`,
      allImageUrls: imageUrls // Send all processed URLs so far
    });
    
    console.log(`📸 Image ${i + 1} URL sent to frontend: ${frontendUrl}`);
  }

  // Send all validated image URLs at once
  sendProgressToClients('all_images_processed', {
    message: 'All images processed and URLs generated',
    totalImages: validatedImagePaths.length,
    imageUrls: imageUrls,
    validatedPaths: validatedImagePaths
  });

  // Verify we have valid images
  if (validatedImagePaths.length === 0) {
    sendProgressToClients('error', {
      message: 'No valid images found',
      step: 'image_validation'
    });
    return;
  }

  // Update imagePaths to only include validated ones
  const finalImagePaths = validatedImagePaths;

  // Send audio generation start notification
  sendProgressToClients('audio_generation_start', {
    message: 'Starting audio generation for subtitles',
    totalSubtitles: subtitles.length,
    imageUrls: imageUrls // Include image URLs in audio generation start
  });

  // Generate audio files
  const createAudioFiles = async () => {
    const audioFiles = [];
    for (let i = 0; i < subtitles.length; i++) {
      const text = subtitles[i];
      const audioPath = path.resolve(tempAudioFolder, `audio${i}.wav`);

      // Send progress for each audio file being generated
      sendProgressToClients('audio_generation_progress', {
        index: i,
        total: subtitles.length,
        text: text,
        message: `Generating audio ${i + 1} of ${subtitles.length}`,
        correspondingImage: imageUrls[i] || null
      });

      try {
        await new Promise((resolve, reject) => {
          say.export(text, null, 1.0, audioPath, (err) => {
            if (err) reject(`❌ Error generating audio for "${text}": ${err}`);
            else {
              console.log(`✅ Generated audio: ${audioPath}`);
              audioFiles.push(audioPath);
              
              // Send progress update for completed audio
              sendProgressToClients('audio_generated', {
                index: i,
                total: subtitles.length,
                audioPath: audioPath,
                message: `Audio generated for: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`,
                correspondingImage: imageUrls[i] || null
              });
              
              resolve();
            }
          });
        });
      } catch (error) {
        console.error(error);
        sendProgressToClients('error', {
          message: `Failed to generate audio: ${error}`,
          step: 'audio_generation',
          audioIndex: i
        });
        return [];
      }
    }
    return audioFiles;
  };

  const audioFiles = await createAudioFiles();
  if (audioFiles.length !== subtitles.length) {
    console.error("❌ Mismatch in subtitles and audio files. Aborting...");
    sendProgressToClients('error', {
      message: 'Mismatch in subtitles and audio files',
      step: 'audio_validation'
    });
    return;
  }

  // Send video processing start notification with image URLs
  sendProgressToClients('video_processing_start', {
    message: 'Starting video segment creation',
    totalSegments: subtitles.length,
    imageUrls: imageUrls,
    audioFiles: audioFiles.length
  });

  // Get audio durations
  const getAudioDurations = async () => {
    return Promise.all(
      audioFiles.map(
        (audioPath) =>
          new Promise((resolve, reject) => {
            ffmpeg.ffprobe(audioPath, (err, metadata) => {
              if (err)
                reject(`❌ Error retrieving duration for ${audioPath}: ${err}`);
              else resolve(metadata.format.duration);
            });
          })
      )
    );
  };

  const durations = await getAudioDurations();

  // First, determine target dimensions by examining all images
  const getImageDimensions = async () => {
    return Promise.all(
      finalImagePaths.map(
        (imagePath) =>
          new Promise((resolve, reject) => {
            ffmpeg.ffprobe(imagePath, (err, metadata) => {
              if (err)
                reject(
                  `❌ Error retrieving dimensions for ${imagePath}: ${err}`
                );
              else {
                const stream = metadata.streams.find(
                  (s) => s.codec_type === "video"
                );
                if (!stream) {
                  reject(`❌ No video stream found in ${imagePath}`);
                  return;
                }
                resolve({
                  width: stream.width || 1280,
                  height: stream.height || 720,
                });
              }
            });
          })
      )
    );
  };

  try {
    const dimensions = await getImageDimensions();
    console.log("📏 Image dimensions:", dimensions);

    // Create video segments with individual processing
    const segmentPaths = [];
    for (let i = 0; i < subtitles.length; i++) {
      const segmentPath = path.resolve(tempSegmentFolder, `segment${i}.mp4`);
      console.log(`📼 Creating segment: ${segmentPath}`);

      // Send progress for segment creation with corresponding image URL
      sendProgressToClients('segment_creation_start', {
        index: i,
        total: subtitles.length,
        message: `Creating video segment ${i + 1} of ${subtitles.length}`,
        correspondingImage: imageUrls[i] || null,
        subtitle: subtitles[i]
      });

      try {
        await new Promise((resolve, reject) => {
          // Force even dimensions with the scale filter
          ffmpeg()
            .input(finalImagePaths[i])
            .inputOptions(["-loop", "1"]) // loop image
            .input(audioFiles[i])
            .outputOptions([
              `-t ${durations[i]}`, // total duration of the segment
              "-c:v libx264",
              "-pix_fmt yuv420p",
              "-c:a aac",
              "-shortest",
            ])
            .videoFilters([
              ...(enableZoomPan ? ["zoompan=z='zoom+0.001':d=125:s=1280x720"] : []),
              "scale=trunc(iw/2)*2:trunc(ih/2)*2"
            ])            
            .on("start", (commandLine) => {
              console.log(`🚀 FFmpeg command: ${commandLine}`);
            })
            .on("progress", (progress) => {
              // Send FFmpeg progress updates with image info
              sendProgressToClients('segment_progress', {
                segmentIndex: i,
                total: subtitles.length,
                percent: progress.percent || 0,
                timemark: progress.timemark,
                message: `Processing segment ${i + 1}: ${Math.round(progress.percent || 0)}%`,
                correspondingImage: imageUrls[i] || null
              });
            })
            .on("end", () => {
              console.log(`✅ Created segment: ${segmentPath}`);
              segmentPaths.push(segmentPath);
              
              // Send segment completion update
              sendProgressToClients('segment_created', {
                index: i,
                total: subtitles.length,
                segmentPath: segmentPath,
                message: `Segment ${i + 1} of ${subtitles.length} completed`,
                correspondingImage: imageUrls[i] || null
              });
              
              resolve();
            })
            .on("error", (err, stdout, stderr) => {
              console.error(`❌ Error during segment creation: ${err.message}`);
              if (stderr) console.error(`FFmpeg stderr: ${stderr}`);
              
              sendProgressToClients('error', {
                message: `Error creating segment ${i + 1}: ${err.message}`,
                step: 'segment_creation',
                segmentIndex: i,
                correspondingImage: imageUrls[i] || null
              });
              
              reject(err);
            })
            .save(segmentPath);
        });
      } catch (error) {
        console.error(`❌ Error creating segment ${i}:`, error);
        return;
      }
    }

    // Check if segments were successfully created
    if (segmentPaths.length !== subtitles.length) {
      console.error(
        "❌ Not all segments were created. Aborting final video creation."
      );
      sendProgressToClients('error', {
        message: 'Not all segments were created',
        step: 'segment_validation'
      });
      return;
    }

    // Send final video assembly start notification
    sendProgressToClients('final_assembly_start', {
      message: 'Assembling final video from segments',
      totalSegments: segmentPaths.length,
      imageUrls: imageUrls // Include all image URLs in final assembly
    });

    // Create a file with the list of segments for concatenation
    const listFilePath = path.resolve(tempSegmentFolder, "segments.txt");
    const fileContent = segmentPaths.map((p) => `file '${p}'`).join("\n");
    fs.writeFileSync(listFilePath, fileContent);
    console.log(`📝 Created segment list: ${listFilePath}`);

    // Use concat demuxer for more reliable concatenation
    ffmpeg()
      .input(listFilePath)
      .inputOptions(["-f", "concat", "-safe", "0"])
      .outputOptions(["-c:v", "copy", "-c:a", "copy"])
      .on("start", (command) =>
        console.log("🔄 FFmpeg concatenation command:", command)
      )
      .on("progress", (progress) => {
        // Send final assembly progress
        sendProgressToClients('final_assembly_progress', {
          percent: progress.percent || 0,
          timemark: progress.timemark,
          message: `Assembling final video: ${Math.round(progress.percent || 0)}%`
        });
      })
      .on("end", () => {
        console.log(
          `🎉 Final video created successfully at: ${outputVideoPath}`
        );

        // Send completion notification with final video URL and all image URLs
        const relativePath = path.relative(path.resolve("public"), outputVideoPath);
        const frontendVideoUrl = `/${relativePath.replace(/\\/g, '/')}`;
        
        
        sendProgressToClients('video_completed', {
          videoUrl: frontendVideoUrl,
          message: 'Video creation completed successfully!',
          outputPath: outputVideoPath,
          imageUrls: imageUrls, // Include all image URLs in completion
          totalSegments: segmentPaths.length,
          processingTime: Date.now() - uniqueId
        });

        // Clean up temporary folders after successful video creation
        try {
          // Keep this commented if you want to preserve temp files for debugging
          // fs.rmSync(tempSegmentFolder, { recursive: true, force: true });
          // fs.rmSync(tempAudioFolder, { recursive: true, force: true });
          console.log(`🧹 Cleanup step (optional)`);
        } catch (err) {
          console.error(
            `⚠️ Warning: Could not clean up temporary folders:`,
            err
          );
        }

        if (callback) callback(outputVideoPath);
      })
      .on("error", (err, stdout, stderr) => {
        console.error("❌ Error creating final video:", err.message);
        if (stderr) console.error(`FFmpeg stderr: ${stderr}`);
        
        sendProgressToClients('error', {
          message: `Error creating final video: ${err.message}`,
          step: 'final_assembly'
        });
      })
      .save(outputVideoPath);

    // Always return generated relative path:
    const publicPath = outputVideoPath.replace(path.resolve("public"), "");
    return `/public${publicPath}`;
  } catch (error) {
    console.error(`❌ Error during processing: ${error}`);
    sendProgressToClients('error', {
      message: `Error during processing: ${error}`,
      step: 'general_processing'
    });
  }
};

export default video;