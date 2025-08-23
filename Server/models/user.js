// Server/models/User.js
import mongoose from 'mongoose';

const ownerRatingSchema = new mongoose.Schema({
  value: { type: Number, min: 1, max: 5, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false, timestamps: true });

const userSchema = new mongoose.Schema({
  name:   { type: String, trim: true, required: true },
  phone:  { type: String, trim: true, required: true },
  email:  { type: String, trim: true, lowercase: true, unique: true, required: true },
  role:   { type: String, enum: ['owner', 'seeker', 'admin','coworker'], required: true },
  passwordHash: { type: String, required: true },
  ownerRatings: [ownerRatingSchema],
}, { timestamps: true });

export default mongoose.model('User', userSchema);
// Server/models/User.js
import mongoose from 'mongoose';

const ownerRatingSchema = new mongoose.Schema({
  value: { type: Number, min: 1, max: 5, required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false, timestamps: true });

const userSchema = new mongoose.Schema({
  name:   { type: String, trim: true, required: true },
  phone:  { type: String, trim: true, required: true },
  email:  { type: String, trim: true, lowercase: true, unique: true, required: true },
  role:   { type: String, enum: ['owner', 'seeker', 'admin','coworker'], required: true },
  passwordHash: { type: String, required: true },
  ownerRatings: [ownerRatingSchema],
}, { timestamps: true });

export default mongoose.model('User', userSchema);
