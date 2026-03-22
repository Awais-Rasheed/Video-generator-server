import video_generator from "../Services/VideoGeneratorService.mjs";
import Video from "../Model/Video.mjs"; // import model

export const generateVideo = async (req, res) => {
  try {
    const { prompt } = req.body;
    const userId = req.auth0User?.sub;

    if (!prompt) return res.status(400).json({ error: "Prompt is required" });
    if (!userId) return res.status(401).json({ error: "Unauthorized user" });

    const generatedVideoUrl = await video_generator(prompt);

    // save to DB
    await Video.create({ userId, prompt, videoUrl: generatedVideoUrl });

    res.status(200).json({
      message: "Video generated and saved",
      videoUrl: generatedVideoUrl
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
