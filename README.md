# LearnHub: MERN Learning Management System

LearnHub is an online learning platform with three roles: **students** browse, enrol, learn and take auto-graded quizzes; **instructors** build courses and see aggregation-based analytics; **admins** moderate courses and manage users.

**Stack:** Node.js · Express 4 · Mongoose 8 · MongoDB · bcrypt · jsonwebtoken · dotenv · React 18 · Vite 5 · react-router-dom 6 · Fetch API · Context API. No UI library; plain responsive CSS.

## Quick start

Requires **Node.js 18+**. The first run needs internet access: npm packages, plus a one-off MongoDB binary download (about 100 MB) for in-memory mode.

**1. API** (http://localhost:5050):

```bash
cd server && cp .env.example .env && npm install && npm run dev
```

On Windows, use `copy .env.example .env`. Then put a long random value in `JWT_SECRET` in `server/.env`.

**2. Client** (http://localhost:5173), in a second terminal:

```bash
cd client && npm install && npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to port 5050.

With `MONGO_URI=memory` (the default), the server starts an in-memory MongoDB and **auto-seeds the demo data on every start**. Data resets on restart.

To use a real database instead, set `MONGO_URI=mongodb://127.0.0.1:27017/learnhub` (or an Atlas URI) in `server/.env` and run `npm run seed` once.

**Production (one server, one port):**

```bash
cd client && npm run build && cd ../server && npm start
```

Open http://localhost:5050. Express serves `client/dist` when it exists.

**API smoke test:** with the API running in memory mode, run `npm run test:smoke` in `server/`. It runs the section 11 checks: auth, catalogue, enrolment and progress, quizzes, ownership, admin, analytics and cascade delete. It changes data, so restart the server afterwards for a clean seed.

## Demo logins

The Login page has one-click demo buttons.

| Role | Email | Password |
|---|---|---|
| Admin | admin@learnhub.com | admin123 |
| Instructor | riya@learnhub.com | instructor123 |
| Instructor | arjun@learnhub.com | instructor123 |
| Student | student@learnhub.com | student123 |
| Student | priya@learnhub.com | student123 |
| Student | rahul@learnhub.com | student123 |

The seed holds 4 courses: *JavaScript Fundamentals*, *React for Beginners* and *MongoDB & Mongoose* are approved; *Python Data Analysis* is pending, for the approval demo. It also has 3 quizzes (9 questions), 5 enrolments and 3 quiz attempts.

## Features

- **Student:** search and filter the catalogue, enrol, read lessons (text plus video embed), mark lessons complete with a live progress bar, take quizzes graded on the server with a review of the correct answers, and see past attempts.
- **Instructor:** create courses (they start *pending*), add, rename, reorder and delete modules, add, edit and delete lessons, build quizzes, and see a dashboard with per-course and per-quiz analytics.
- **Admin:** approve, block or reset courses, filter them by status, see platform stats, block or unblock users, change roles, and create instructors.

## Data model

There are 6 collections: **User, Course, Lesson, Enrollment, Quiz and Attempt**.

- **Course modules are embedded.** They are small, always read with the course, and ordered.
- **Lessons are referenced** by ObjectId from `Course.modules[].lessons`. They can be large, are edited on their own, and are loaded one at a time.
- **Quiz questions are embedded.** They belong to one quiz and are graded together.
- **Enrollment** has a unique `{student, course}` index. **Attempt** stores each graded submission.

```
User(instructor) 1───* Course 1───* Module(embedded) *───* Lesson(ref)
User(student)    1───* Enrollment *───1 Course        Enrollment.completedLessons → Lesson
Course 1───* Quiz(questions embedded) 1───* Attempt *───1 User(student)
```

## API (all under `/api`)

| Method | Path | Access |
|---|---|---|
| GET | `/health` | public |
| POST | `/auth/register`, `/auth/login` | public |
| GET | `/auth/me` | logged in |
| GET | `/courses?search=&category=` | public (approved only) |
| GET | `/courses/mine` | instructor |
| GET | `/courses/:id` | public, with optional auth |
| POST | `/courses` | instructor, admin |
| PUT / DELETE | `/courses/:id` | owner, admin |
| POST | `/courses/:id/modules` | owner, admin |
| PUT / DELETE | `/courses/:id/modules/:moduleId` | owner, admin |
| POST | `/courses/:id/modules/:moduleId/lessons` | owner, admin |
| GET | `/lessons/:id` | enrolled, owner, admin |
| PUT / DELETE | `/lessons/:id` | owner, admin |
| GET | `/enrollments/me` | student |
| POST | `/enrollments/:courseId` | student |
| POST | `/enrollments/:courseId/complete/:lessonId` | student |
| POST | `/quizzes` | owner, admin |
| GET | `/quizzes/:id` | enrolled, owner, admin (answers hidden from students) |
| PUT / DELETE | `/quizzes/:id` | owner, admin |
| POST | `/quizzes/:id/attempt` | enrolled student |
| GET | `/quizzes/:id/attempts/me` | student |
| GET | `/analytics/instructor` | instructor (aggregation pipelines) |
| GET | `/admin/stats` | admin |
| GET | `/admin/courses?status=` | admin |
| PATCH | `/admin/courses/:id/status` | admin |
| GET / POST | `/admin/users` | admin |
| PATCH | `/admin/users/:id` | admin (not yourself) |

Send the auth header as `Authorization: Bearer <token>`. For more detail (architecture, business rules, demo script, troubleshooting, viva Q&A), see [`LearnHub_Project_Guide.md`](LearnHub_Project_Guide.md).

## Project structure

```
server/   Express API: config/, middleware/, models/, controllers/, routes/, seed.js, server.js
client/   React app: src/api, src/context, src/components, src/pages/{student,instructor,admin}
```
