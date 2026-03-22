const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

const genAI = new GoogleGenerativeAI("AIzaSyBbhgCUNWQjDwUyvw8JaiHWfv2VXDAVTzE");

async function generateImage(prompt) {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-exp-image-generation",
        generationConfig: {
            responseModalities: ['Text', 'Image']
        },
      });

  try {
    // Send request properly
    const response = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const candidate = response.response?.candidates?.[0];
    
    if (!candidate) {
      console.error("No candidates found in response.");
      return;
    }

    // Extract text response (if any)
    if (candidate.content?.parts?.[0]?.text) {
      console.log("Generated text:", candidate.content.parts[0].text);
    }

    // Extract image response
    if (candidate.content?.parts?.[0]?.inlineData) {
      const imageData = candidate.content.parts[0].inlineData.data;
      const buffer = Buffer.from(imageData, "base64");
      fs.writeFileSync("gemini-image.png", buffer);
      console.log("Image saved as gemini-image.png");
    } else {
      console.error("No image data found in response.");
    }
  } catch (error) {
    console.error("Error generating content:", error);
  }
}

// Call the function
generateImage(
  "Create a 3D rendered image of a pig with wings and a top hat flying over a futuristic city with lots of greenery."
);
