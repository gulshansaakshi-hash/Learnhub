import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import User from './models/User.js';
import Course from './models/Course.js';
import Lesson from './models/Lesson.js';
import Enrollment from './models/Enrollment.js';
import Quiz from './models/Quiz.js';
import Attempt from './models/Attempt.js';

const users = [
  { name: 'Admin User', email: 'admin@learnhub.com', password: 'admin123', role: 'admin' },
  { name: 'Riya Sharma', email: 'riya@learnhub.com', password: 'instructor123', role: 'instructor' },
  { name: 'Arjun Mehta', email: 'arjun@learnhub.com', password: 'instructor123', role: 'instructor' },
  { name: 'Student One', email: 'student@learnhub.com', password: 'student123', role: 'student' },
  { name: 'Priya Singh', email: 'priya@learnhub.com', password: 'student123', role: 'student' },
  { name: 'Rahul Verma', email: 'rahul@learnhub.com', password: 'student123', role: 'student' },
];

const courses = [
  {
    key: 'js',
    instructor: 'riya@learnhub.com',
    title: 'JavaScript Fundamentals',
    description:
      'Learn the core building blocks of JavaScript: variables, types, functions, arrays, objects and the DOM.',
    category: 'Web Development',
    price: 0,
    status: 'approved',
    modules: [
      { title: 'Getting Started', lessons: ['Variables and Types', 'Operators and Expressions', 'Control Flow'] },
      { title: 'Functions and Objects', lessons: ['Functions and Scope', 'Arrays and Objects', 'Working with the DOM'] },
    ],
  },
  {
    key: 'react',
    instructor: 'riya@learnhub.com',
    title: 'React for Beginners',
    description: 'Build modern user interfaces with React components, props, state, hooks and routing.',
    category: 'Web Development',
    price: 499,
    status: 'approved',
    modules: [
      { title: 'React Basics', lessons: ['JSX and Components', 'Props', 'State with useState'] },
      { title: 'Hooks and Routing', lessons: ['useEffect and Data Fetching', 'Context API', 'React Router'] },
    ],
  },
  {
    key: 'mongo',
    instructor: 'arjun@learnhub.com',
    title: 'MongoDB & Mongoose',
    description: 'Model data in MongoDB, write queries and aggregation pipelines, and use Mongoose in Node.js.',
    category: 'Databases',
    price: 299,
    status: 'approved',
    modules: [
      { title: 'MongoDB Basics', lessons: ['Documents and Collections', 'CRUD Queries'] },
      { title: 'Mongoose in Practice', lessons: ['Schemas and Validation', 'Embedding vs Referencing'] },
    ],
  },
  {
    key: 'python',
    instructor: 'arjun@learnhub.com',
    title: 'Python Data Analysis',
    description: 'Analyse real datasets with Python, pandas and simple visualisations.',
    category: 'Data Science',
    price: 599,
    status: 'pending',
    modules: [{ title: 'Pandas Essentials', lessons: ['DataFrames 101', 'Cleaning and Grouping Data'] }],
  },
];

const quizzes = [
  {
    course: 'js',
    title: 'JavaScript Basics Quiz',
    passMark: 60,
    questions: [
      { question: 'Which keyword declares a block-scoped variable that can be reassigned?', options: ['var', 'let', 'const', 'static'], correctIndex: 1 },
      { question: 'What does typeof null return?', options: ['"null"', '"undefined"', '"object"', '"number"'], correctIndex: 2 },
      { question: 'Which method adds an item to the end of an array?', options: ['push()', 'pop()', 'shift()', 'slice()'], correctIndex: 0 },
    ],
  },
  {
    course: 'react',
    title: 'React Hooks Quiz',
    passMark: 50,
    questions: [
      { question: 'Which hook stores local component state?', options: ['useEffect', 'useState', 'useRef', 'useMemo'], correctIndex: 1 },
      { question: 'When does useEffect with an empty dependency array run?', options: ['On every render', 'Never', 'Once after the first render', 'Only on unmount'], correctIndex: 2 },
      { question: 'Which hook reads a value from a Context?', options: ['useContext', 'useReducer', 'useCallback', 'useLayoutEffect'], correctIndex: 0 },
    ],
  },
  {
    course: 'mongo',
    title: 'Data Modelling Quiz',
    passMark: 50,
    questions: [
      { question: 'What is the maximum size of a single MongoDB document?', options: ['1 MB', '16 MB', '64 MB', 'Unlimited'], correctIndex: 1 },
      { question: 'Which aggregation stage joins another collection?', options: ['$group', '$match', '$lookup', '$project'], correctIndex: 2 },
      { question: 'Small sub-documents that are always read with their parent are best...', options: ['Embedded', 'Referenced', 'Stored in a separate database', 'Stored as strings'], correctIndex: 0 },
    ],
  },
];

// [student, course, completed lesson count]
const enrollments = [
  ['student@learnhub.com', 'js', 2],
  ['student@learnhub.com', 'mongo', 1],
  ['priya@learnhub.com', 'js', 6],
  ['priya@learnhub.com', 'react', 3],
  ['rahul@learnhub.com', 'react', 1],
];

// [student, quiz index, answers]
const attempts = [
  ['priya@learnhub.com', 0, [1, 2, 0]], // 3/3
  ['priya@learnhub.com', 1, [1, 0, 0]], // 2/3
  ['rahul@learnhub.com', 1, [0, 0, 1]], // 0/3
];

export async function seedDatabase({ log = true } = {}) {
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Lesson.deleteMany({}),
    Enrollment.deleteMany({}),
    Quiz.deleteMany({}),
    Attempt.deleteMany({}),
  ]);
  await Promise.all([User.syncIndexes(), Enrollment.syncIndexes()]);

  // Users (save() so the pre-save hook hashes each password)
  const userByEmail = {};
  for (const u of users) userByEmail[u.email] = await User.create(u);

  // Courses with embedded modules and referenced lessons
  const courseByKey = {};
  const lessonsByKey = {};
  for (const c of courses) {
    const course = new Course({
      title: c.title,
      description: c.description,
      category: c.category,
      price: c.price,
      status: c.status,
      instructor: userByEmail[c.instructor]._id,
      modules: [],
    });
    lessonsByKey[c.key] = [];
    c.modules.forEach((m, mi) => {
      const lessonIds = m.lessons.map((title, li) => {
        const lesson = new Lesson({
          course: course._id,
          title,
          content: `In this lesson we cover: ${title}.\n\nWork through the explanation, try the examples yourself, then mark the lesson complete.`,
          videoUrl: '',
          duration: 10 + li * 5,
          order: li + 1,
        });
        lessonsByKey[c.key].push(lesson);
        return lesson._id;
      });
      course.modules.push({ title: m.title, order: mi + 1, lessons: lessonIds });
    });
    await Lesson.insertMany(lessonsByKey[c.key]);
    courseByKey[c.key] = await course.save();
  }

  // Quizzes
  const quizDocs = [];
  for (const q of quizzes) {
    quizDocs.push(await Quiz.create({ ...q, course: courseByKey[q.course]._id }));
  }

  // Enrolments with progress
  for (const [email, key, done] of enrollments) {
    const course = courseByKey[key];
    const completed = lessonsByKey[key].slice(0, done).map((l) => l._id);
    await Enrollment.create({
      student: userByEmail[email]._id,
      course: course._id,
      completedLessons: completed,
      progress: Math.round((completed.length / course.lessonCount()) * 100),
    });
  }

  // Attempts, graded the same way as the API
  for (const [email, qi, answers] of attempts) {
    const quiz = quizDocs[qi];
    const score = quiz.questions.reduce((s, q, i) => s + (answers[i] === q.correctIndex ? 1 : 0), 0);
    const total = quiz.questions.length;
    const percentage = Math.round((score / total) * 100);
    await Attempt.create({
      student: userByEmail[email]._id,
      quiz: quiz._id,
      course: quiz.course,
      answers,
      score,
      total,
      percentage,
      passed: percentage >= quiz.passMark,
    });
  }

  if (log) {
    console.log(
      `Seeded: ${users.length} users, ${courses.length} courses, ` +
        `${Object.values(lessonsByKey).flat().length} lessons, ${quizDocs.length} quizzes, ` +
        `${enrollments.length} enrolments, ${attempts.length} attempts`
    );
  }
}

// Run directly: npm run seed
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { connectDB, disconnectDB } = await import('./config/db.js');
  try {
    await connectDB();
    await seedDatabase();
    console.log('Demo logins: admin@learnhub.com / admin123, riya@learnhub.com / instructor123, student@learnhub.com / student123');
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}
