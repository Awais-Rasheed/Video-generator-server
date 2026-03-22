// /Model/User.mjs
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  auth0Id: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  name: { type: String, required: true },
  username: { type: String, required: true }, // ← derived from Auth0 `nickname`
  picture: { type: String },  // ← optional
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;
