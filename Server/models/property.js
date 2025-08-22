// Server/models/Property.js
import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  address:      { type: String, trim: true, required: true },
  neighborhood: { type: String, trim: true, default: '' },
  sqft:         { type: Number, default: 0 },
  parking:      { type: Boolean, default: false },
  transit:      { type: Boolean, default: false },
  photos:       [{ type: String }],
  owner:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('Property', propertySchema);
