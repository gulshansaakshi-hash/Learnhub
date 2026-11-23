import mongoose from 'mongoose';

// Questions are EMBEDDED: they belong to one quiz and are graded together.
const questionSchema = new mongoose.Schema({
  question: { type: String, required: [true, 'Question text is required'], trim: true },
  options: {
    type: [String],
    validate: {
      validator: (v) => Array.isArray(v) && v.length >= 2,
      message: 'Each question needs at least 2 options',
    },
  },
  correctIndex: { type: Number, required: true, min: 0 },
});

const quizSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    title: { type: String, required: [true, 'Quiz title is required'], trim: true },
    passMark: { type: Number, default: 50, min: 0, max: 100 },
    questions: [questionSchema],
  },
  { timestamps: true }
);

export default mongoose.model('Quiz', quizSchema);
