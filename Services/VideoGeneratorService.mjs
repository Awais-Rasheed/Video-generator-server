import image_generator from "./ImageGeneratorService.mjs";
import TextGenerator from "./TextGeneratorService.mjs";
import natural from 'natural';
import video from './VideoService.mjs'

const video_generator = async (prompt) => {
    try {
        const text = await TextGenerator(prompt);
        var tokenizer = new natural.RegexpTokenizer({ pattern: /\./ });

        var subtitles = tokenizer.tokenize(text).map(sub => sub.trim()).filter(Boolean);
        let imagePaths = [];

for (let i = 0; i < subtitles.length; i++) {
    try {
        console.log(`🎬 Generating image for subtitle: "${subtitles[i]}"`);

        const imagePath = await image_generator(subtitles[i]); // Directly get the image path

        console.log("🔍 Raw Response:", imagePath); // Debugging

        if (imagePath && typeof imagePath === "string") {  // Fix: Directly check the string
            console.log(`✅ Image saved: ${imagePath}`);
            // http://localhost:5000/public/downloads/output_1742399774420.png
            imagePaths.push(imagePath);
        } else {
            console.warn(`⚠️ No valid image found for "${subtitles[i]}"`);
        }
    } catch (err) {
        console.error(`❌ Error generating image for "${subtitles[i]}":`, err);
    }
}

console.log("🖼️ Final image paths:", imagePaths);



        if (imagePaths.length !== subtitles.length) {
            console.warn("Mismatch between generated images and subtitles. Adjusting...");
            subtitles = subtitles.slice(0, imagePaths.length); // Ensure equal count
        }

        console.log("Final Subtitles:", subtitles);
        console.log("Final Images:", imagePaths);

        if (imagePaths.length > 0) {
            const generatedVideoUrl = video(imagePaths, subtitles); // Call video function with aligned data
            return generatedVideoUrl; 
        } else {
            console.error("No images were successfully generated.");
        }

    } catch (error) {
        console.error("Error in video generation:", error);
    }
};

export default video_generator;
