import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // auth0 sub
  prompt: { type: String, required: true },
  videoUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Video', videoSchema);