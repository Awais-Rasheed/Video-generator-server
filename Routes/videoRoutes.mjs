import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { auth0Middleware } from '../middleware/auth0Verify.mjs';
import Video from '../Model/Video.mjs';

const router = express.Router();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Endpoint to list all videos in the public folder
router.get('/list', (req, res) => {
  try {
    const videosDirectory = path.join(__dirname, '../public/videos');
    
    // Check if directory exists
    if (!fs.existsSync(videosDirectory)) {
      return res.status(200).json({ videos: [] });
    }
    
    // Read the directory
    const files = fs.readdirSync(videosDirectory);
    
    // Filter for video files and get file info
    const videos = files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.mp4', '.webm', '.mov', '.avi'].includes(ext);
      })
      .map(file => {
        const filePath = path.join(videosDirectory, file);
        const stats = fs.statSync(filePath);
        
        return {
          name: file,
          path: `/public/videos/${file}`, // Path relative to public folder
          size: stats.size,
          created: stats.mtime
        };
      })
      // Sort by creation date (newest first)
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.status(200).json({ videos });
  } catch (error) {
    console.error('Error listing videos:', error);
    res.status(500).json({ error: 'Failed to list videos' });
  }
});

router.get('/history', auth0Middleware, async (req, res) => {
  const userId = req.auth0User?.sub;
  if (!userId) return res.status(400).json({ error: 'Missing user ID' });

  const videos = await Video.find({ userId }).sort({ createdAt: -1 });
  res.json({ videos });
});



// Export as default
export default router;