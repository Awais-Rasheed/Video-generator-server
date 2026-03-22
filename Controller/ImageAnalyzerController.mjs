import multer from 'multer';
import detectLandmark from '../Services/ImageAnalyzerService.mjs';

// Configure multer for file uploads
const upload = multer({ dest: 'public/uploads/' });

const detectLandmarkController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const detectionResult = await detectLandmark(req.file.path);
    res.json({ result: detectionResult || "No Result" });
  } catch (error) {
    console.error('Backend Error:', error);
    res.status(500).json({ error: 'An error occurred' });
  }
};

export default detectLandmarkController;


