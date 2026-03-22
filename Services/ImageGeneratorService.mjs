import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const genAI = new GoogleGenerativeAI("AIzaSyA849vwSanQ_RRg_OvIgfDFmOgJgNUa5Oo");

async function image_generator(prompt) {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp-image-generation",
        generationConfig: {
            responseModalities: ["Text", "Image"],
        },
    });

    try {
        console.log("Sending image generation request with prompt:", prompt);

        // Send request properly
        const response = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: `Create image of "${prompt}"` }] }],
        });

        const candidate = response.response?.candidates?.[0];

        if (!candidate) {
            console.error("No candidates found in response.");
            return null;
        }

        // Extract image response
        if (candidate.content?.parts?.[0]?.inlineData) {
            const imageData = candidate.content.parts[0].inlineData.data;
            const buffer = Buffer.from(imageData, "base64");

            // Ensure the downloads folder exists
            const downloadsDir = path.join("public", "downloads");
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir, { recursive: true });
            }

            // Generate a unique file name
            const fileName = `output_${Date.now()}.png`;
            const filePath = path.join(downloadsDir, fileName);

            // Save the image to the specified folder
            fs.writeFileSync(filePath, buffer);
            console.log(`Image saved to: ${filePath}`);

            // Return the image URL
            return `public/downloads/${fileName}`;
        } else {
            console.error("No image data found in response.");
            return null;
        }
    } catch (error) {
        console.error("Error generating content:", error);
        console.error("Caught error in image_generator:", error);

        return null;
    }
}

export default image_generator;
