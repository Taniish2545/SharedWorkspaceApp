// Server/models/Workspace.js
import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  value: { type: Number, min: 1, max: 5, required: true },
  by:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false, timestamps: true });

const reviewSchema = new mongoose.Schema({
  text: { type: String, trim: true, required: true },
  by:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false, timestamps: true });

const workspaceSchema = new mongoose.Schema({
  type:     { type: String, trim: true, required: true },
  seats:    { type: Number, default: 1 },
  price:    { type: Number, required: true },
  term:     { type: String, trim: true, default: '' },
  smoking:  { type: Boolean, default: false },
  photos:   [{ type: String }],
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ratings:  [ratingSchema],
  reviews:  [reviewSchema],
}, { timestamps: true });

export default mongoose.model('Workspace', workspaceSchema);
// Server/models/Workspace.js
import mongoose from 'mongoose';

const ratingSchema = new mongoose.Schema({
  value: { type: Number, min: 1, max: 5, required: true },
  by:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false, timestamps: true });

const reviewSchema = new mongoose.Schema({
  text: { type: String, trim: true, required: true },
  by:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { _id: false, timestamps: true });

const workspaceSchema = new mongoose.Schema({
  type:     { type: String, trim: true, required: true },
  seats:    { type: Number, default: 1 },
  price:    { type: Number, required: true },
  term:     { type: String, trim: true, default: '' },
  smoking:  { type: Boolean, default: false },
  photos:   [{ type: String }],
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  owner:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ratings:  [ratingSchema],
  reviews:  [reviewSchema],
}, { timestamps: true });

export default mongoose.model('Workspace', workspaceSchema);
