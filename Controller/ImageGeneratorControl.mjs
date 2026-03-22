import image_generator from "../Services/ImageGeneratorService.mjs";
import TextGenerator from "../Services/TextGeneratorService.mjs";

export const imageGenerator = async (req, res) => {
    try {
      const { prompt } = req.body;
      console.log("Received prompt for image generation:", prompt);
  
      const imageUrl = await image_generator(prompt);
      console.log("Generated image URL:", imageUrl);
  
      if (!imageUrl) {
        console.error("Image generation failed. No URL returned.");
        return res.status(500).json({ error: "Failed to generate image" });
      }
  
      res.status(200).json({ imageUrl });
    } catch (error) {
      console.error("Error in /api/image route:", error);
      res.status(500).json({ error: error.message || "Unknown error" });
    }
  };
  

export const textGenerator = async (req, res) => {
    try {
        const { prompt } = req.body;

        const text = await TextGenerator(prompt); // Ensure text is awaited
        res.json({ generatedContent: text });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}



