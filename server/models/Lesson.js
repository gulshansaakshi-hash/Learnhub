import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: [true, 'Lesson title is required'], trim: true },
    content: { type: String, default: '' },
    videoUrl: { type: String, default: '' },
    duration: { type: Number, default: 0, min: 0 },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Lesson', lessonSchema);
