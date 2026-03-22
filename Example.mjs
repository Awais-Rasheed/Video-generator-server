import image_generator from "./Services/ImageGeneratorService.mjs";
import natural from 'natural';

const video_generator = async () => {
    // Use the text directly for now; uncomment TextGenerator when ready
    // const text = await TextGenerator(prompt);
    const text = "A running lion. A black Cat";  // Example input text

    var tokenizer = new natural.RegexpTokenizer({ pattern: /\./ });
    var res = tokenizer.tokenize(text);  // Tokenize the input text

    for (var i = 0; i < res.length; i++) {
        try {
            const response = await image_generator(res[i]);
            console.log('Image URL:', response);  // Log the image URL
        } catch (error) {
            console.error('Error generating image for:', res[i], error);  // Log errors for specific tokens
        }
    }

    console.log("Video generation process complete");
};

video_generator();

// import fs from 'fs';
// import fetch from 'node-fetch';
// import path from 'path';
// import ffmpeg from 'fluent-ffmpeg';

// const url = 'https://api.getimg.ai/v1/essential/text-to-image';



// const prompt = "Elephant";
// const image_generator = async (prompt) => {
//     console.log(`Generating image for prompt: ${prompt}`);
//   const options = {
//     method: 'POST',
//     headers: {
//       accept: 'application/json',
//       'content-type': 'application/json',
//       authorization: 'Bearer key-4nhDGnsnMgcoZbgtYEBfu0bpYDFa7mKykx6YwS0riGj2q9SnPhR9Z6CBbjcgATG8iNZxJnRjsc5IdkeNU95IeSGIyxj4kSsy'
//     },
//     body: JSON.stringify({
//       style: 'photorealism',
//       prompt: prompt,
//       height: 1024,
//       output_format: 'png',
//       width: 1024,
//       response_format: 'url'
//     })
//   };

//   try {
//     const apiRes = await fetch(url, options);
//     const json = await apiRes.json();

//     if (json.url) {
//       const imageRes = await fetch(json.url);

//       // Create a unique directory for each request
//       const uniqueFolderName = `request_${Date.now()}`;
//       const directory = path.join('public', 'downloads', uniqueFolderName);

//       // Ensure the directory exists
//       if (!fs.existsSync(directory)) {
//         fs.mkdirSync(directory, { recursive: true });
//       }

//       const filePath = path.join(directory, `output_${Date.now()}.png`);
//       const fileStream = fs.createWriteStream(filePath);

//       imageRes.body.pipe(fileStream);

//       fileStream.on('finish', async () => {
//         console.log('Download completed:', filePath);

//         // After the image is downloaded, generate video from images
//         await createVideoFromImages(directory);
//       });

//       fileStream.on('error', (err) => {
//         console.error('Error downloading the image:', err);
//       });

//       return json.url;
//     } else {
//       throw new Error('No image URL in response');
//     }
//   } catch (err) {
//     console.error('Error:', err);
//     throw err;
//   }
// };

// // Function to create a video from images using fluent-ffmpeg
// const createVideoFromImages = (directory) => {
//   return new Promise((resolve, reject) => {
//     const outputVideoPath = path.join(directory, 'output_video.mp4');

//     // Create a video from images in the directory
//     ffmpeg()
//       .addInput(`${directory}/output_*.png`) // Assuming all images start with "output_"
//       .inputOptions('-pattern_type glob') // Use a glob pattern to match images
//       .outputOptions('-c:v libx264', '-r 25', '-pix_fmt yuv420p') // Set video options
//       .output(outputVideoPath)
//       .on('end', () => {
//         console.log('Video created successfully:', outputVideoPath);
//         resolve(outputVideoPath);
//       })
//       .on('error', (err) => {
//         console.error('Error creating video:', err);
//         reject(err);
//       })
//       .run();
//   });
// };

// // export default image_generator;
// image_generator