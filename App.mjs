import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import routes from './Routes/routes.mjs'
import videoRoutes from './Routes/videoRoutes.mjs'
import video from './Services/VideoService.mjs'
import path from 'path'
import fs from 'fs'
import { clients, sendProgressToClients, getLastImageUrls} from './utils/sse.mjs';
import authRoutes from './Routes/authRoutes.mjs';
import connectDB from './config/db.mjs';

const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use("/public", express.static("public"));
app.use(express.static("public"));
app.use("/downloads", express.static(path.resolve("public/downloads")));

connectDB(); 

app.use('/api/user', authRoutes);
app.use('/api', routes);
app.use('/api/video', videoRoutes);

// Global clients array to store SSE connections


// SSE endpoint for progress updates
app.get("/api/video/progress", (req, res) => {
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control"
    });
    
    res.flushHeaders();
    
    // Add client to the list
    clients.push(res);
    console.log(`🟢 SSE client connected (${clients.length} total)`);
    
    // Send initial connection message
    res.write(`data: ${JSON.stringify({ 
      type: "connection_established", 
      data: { message: "SSE connection established" } 
    })}\n\n`);
    
    // Handle client disconnect
    req.on("close", () => {
      const index = clients.indexOf(res);
      if (index !== -1) {
        clients.splice(index, 1);
        console.log(`🔴 SSE client disconnected (${clients.length} remaining)`);
      }
    });
    
    // Keep connection alive
    const keepAlive = setInterval(() => {
      if (res.finished) {
        clearInterval(keepAlive);
        return;
      }
      res.write(`: keep-alive\n\n`);
    }, 30000);
});


// Function to generate images dynamically (placeholder - implement your image generation logic)
const generateImages = async (prompt, progressCallback) => {
  const imageFolder = path.resolve("public/images");
  
  // Ensure images directory exists
  if (!fs.existsSync(imageFolder)) {
    fs.mkdirSync(imageFolder, { recursive: true });
  }

  progressCallback({
    type: "image_generation_start",
    data: { 
      message: "Starting image generation...", 
      prompt: prompt 
    }
  });

  const imagePaths = [];
  const numberOfImages = 3; // Adjust based on your needs

  for (let i = 0; i < numberOfImages; i++) {
    try {
      // PLACEHOLDER: Replace this with your actual image generation logic
      // This could be:
      // - AI image generation (DALL-E, Midjourney, Stable Diffusion)
      // - Template-based image creation
      // - Frame extraction from existing videos
      // - Stock image selection based on prompt
      
      progressCallback({
        type: "image_generation_progress",
        data: {
          index: i,
          total: numberOfImages,
          message: `Generating image ${i + 1} of ${numberOfImages} for: "${prompt}"`
        }
      });

      // For now, check if images exist or create placeholder paths
      const imagePath = path.resolve(imageFolder, `generated_${Date.now()}_${i}.jpg`);
      
      // IMPLEMENT YOUR IMAGE GENERATION HERE
      // Example options:
      // 1. Call an AI image generation API
      // 2. Use existing images from a pool
      // 3. Generate procedural images
      // 4. Download from stock image APIs
      
      // For demonstration, let's assume you have existing images or generate them
      const existingImagePath = path.resolve(imageFolder, `${i + 1}.jpg`);
      
      if (fs.existsSync(existingImagePath)) {
        imagePaths.push(existingImagePath);
        console.log(`✅ Using existing image: ${existingImagePath}`);
      } else {
        // If no existing images, you would generate them here
        console.log(`⚠️ Image not found: ${existingImagePath}`);
        // For now, we'll skip this image or you could generate a placeholder
        continue;
      }

      // Send progress update for each generated image
      progressCallback({
        type: "image_generated",
        data: {
          imageUrl: `/images/${path.basename(imagePaths[imagePaths.length - 1])}`,
          index: i,
          total: numberOfImages,
          message: `Generated image ${i + 1} of ${numberOfImages}`
        }
      });

      // Add small delay to simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Error generating image ${i + 1}:`, error);
      progressCallback({
        type: "error",
        data: { 
          message: `Failed to generate image ${i + 1}`, 
          error: error.message 
        }
      });
    }
  }

  progressCallback({
    type: "image_generation_complete",
    data: { 
      message: "Image generation completed", 
      totalImages: imagePaths.length,
      imagePaths: imagePaths
    }
  });

  return imagePaths;
};

// Function to generate subtitles dynamically (placeholder)
const generateSubtitles = async (prompt, imageCount, progressCallback) => {
  progressCallback({
    type: "subtitle_generation_start",
    data: { 
      message: "Generating subtitles...", 
      prompt: prompt 
    }
  });

  // PLACEHOLDER: Implement your subtitle generation logic
  // This could be:
  // - AI text generation based on prompt
  // - Template-based subtitle creation
  // - Manual subtitle input from request body
  
  const subtitles = [];
  for (let i = 0; i < imageCount; i++) {
    // Generate subtitle based on prompt and image index
    // This is a simple example - replace with your logic
    const subtitle = `${prompt} - Part ${i + 1}`;
    subtitles.push(subtitle);
    
    progressCallback({
      type: "subtitle_generated",
      data: {
        index: i,
        total: imageCount,
        subtitle: subtitle,
        message: `Generated subtitle ${i + 1} of ${imageCount}`
      }
    });
  }

  progressCallback({
    type: "subtitle_generation_complete",
    data: { 
      message: "Subtitle generation completed", 
      subtitles: subtitles
    }
  });

  return subtitles;
};

// Video generation endpoint
app.post("/api/video/generate-video", async (req, res) => {
  const { prompt, customImages, customSubtitles } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }
  
  console.log(`🎬 Starting video generation for prompt: "${prompt}"`);
  
  try {
    // Send initial status
    sendProgressToClients({
      type: "video_generation_start",
      data: { 
        message: "Starting video generation...", 
        prompt: prompt 
      }
    });
    
    let imagePaths, subtitles;

    // Generate or use provided images
    if (customImages && customImages.length > 0) {
      // Use provided image paths
      imagePaths = customImages.map(img => path.resolve("public", img));
      console.log("📸 Using provided images:", imagePaths);
    } else {
      // Generate images dynamically
      imagePaths = await generateImages(prompt, sendProgressToClients);
    }

    if (!imagePaths || imagePaths.length === 0) {
      throw new Error("No images available for video generation");
    }

    // Generate or use provided subtitles
    if (customSubtitles && customSubtitles.length > 0) {
      subtitles = customSubtitles;
      console.log("📝 Using provided subtitles:", subtitles);
    } else {
      // Generate subtitles dynamically
      subtitles = await generateSubtitles(prompt, imagePaths.length, sendProgressToClients);
    }

    // Ensure we have matching numbers of images and subtitles
    const minLength = Math.min(imagePaths.length, subtitles.length);
    imagePaths = imagePaths.slice(0, minLength);
    subtitles = subtitles.slice(0, minLength);

    console.log(`🎯 Creating video with ${imagePaths.length} images and ${subtitles.length} subtitles`);
    
    // Call video creation with progress callback
    const outputPath = await video(
      imagePaths,
      subtitles,
      prompt,
      (finalVideoPath) => {
        console.log(`✅ Video generation completed: ${finalVideoPath}`);
      },
      sendProgressToClients,
      { enableZoomPan, script }  // Pass the progress callback
    );
    
    console.log(`🎉 Video generated successfully: ${outputPath}`);
    
    // Send final response
    res.json({ 
      success: true,
      videoUrl: outputPath,
      message: "Video generated successfully",
      imagesUsed: imagePaths.length,
      subtitlesUsed: subtitles.length
    });
    
  } catch (error) {
    console.error("❌ Video generation failed:", error);
    
    // Send error to SSE clients
    sendProgressToClients({
      type: "error",
      data: { 
        message: "Video generation failed", 
        error: error.message 
      }
    });
    
    res.status(500).json({ 
      success: false,
      error: "Video generation failed", 
      details: error.message 
    });
  }
});

// Test endpoint to manually send image data (for debugging)
app.get("/api/video/test-images", (req, res) => {
  console.log("🧪 Sending last video image URLs via SSE");

  const imageUrls = getLastImageUrls();

  if (!imageUrls || imageUrls.length === 0) {
    console.warn("⚠️ No recent image URLs found");
    return res.status(404).json({ message: "No recent image data found" });
  }

  imageUrls.forEach((imgData, index) => {
    setTimeout(() => {
      sendProgressToClients("image_processed", imgData);
    }, index * 1000);
  });

  res.json({
    message: "Last generated video images resent via SSE",
    imageCount: imageUrls.length,
    images: imageUrls,
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    sseClients: clients.length,
    timestamp: new Date().toISOString()
  });
});

app.listen(5000, () => {
    console.log('🚀 Server running on port 5000')
    console.log('📡 SSE endpoint: http://localhost:5000/api/video/progress')
    console.log('🎬 Video generation: POST http://localhost:5000/api/video/generate-video')
    console.log('🧪 Test images: POST http://localhost:5000/api/video/test-images')
})