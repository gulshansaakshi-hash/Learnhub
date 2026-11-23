import mongoose from 'mongoose';

// Modules are EMBEDDED: small, always read with their course, ordered.
const moduleSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Module title is required'], trim: true },
  order: { type: Number, default: 0 },
  // Lessons are REFERENCED: large, edited on their own, tracked per id.
  lessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
});

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Title is required'], trim: true },
    description: { type: String, required: [true, 'Description is required'] },
    category: { type: String, default: 'General', trim: true },
    price: { type: Number, default: 0, min: [0, 'Price cannot be negative'] },
    thumbnail: { type: String, default: '' },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'blocked'], default: 'pending' },
    modules: [moduleSchema],
  },
  { timestamps: true }
);

courseSchema.methods.lessonCount = function lessonCount() {
  return this.modules.reduce((sum, m) => sum + m.lessons.length, 0);
};

export default mongoose.model('Course', courseSchema);
