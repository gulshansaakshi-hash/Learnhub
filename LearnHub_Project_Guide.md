# LearnHub: Project Guide

A shareable guide to the LearnHub MERN Learning Management System. It covers how to run the project, how it's built, a demo script, troubleshooting and viva answers.

## 1. What it is

LearnHub has three roles:

| Role | Can do |
|---|---|
| Student | Browse and search approved courses, enrol, read lessons, mark them complete (progress %), take auto-graded quizzes, see their courses and progress |
| Instructor | Create courses (they start pending), manage modules, lessons and quizzes, see analytics (enrolments, average progress, average score, pass rate) |
| Admin | Approve, block or reset courses, filter courses by status, block or unblock users, change roles, create instructors, see platform stats |

## 2. Running it

The API is on port 5050 and the client on 5173.

```bash
cd server && cp .env.example .env && npm install && npm run dev
```

```bash
cd client && npm install && npm run dev
```

Open http://localhost:5173. `MONGO_URI=memory` runs an in-memory MongoDB that is re-seeded on every start.

For a persistent database, set `MONGO_URI` to a real URI and run `npm run seed` once.

For production, run `npm run build` in `client/`, then `npm start` in `server/`. Everything is then served on port 5050.

**Demo logins:** `admin@learnhub.com` / `admin123`, `riya@learnhub.com` / `instructor123`, `arjun@learnhub.com` / `instructor123`, and `student@learnhub.com`, `priya@learnhub.com`, `rahul@learnhub.com` / `student123`.

## 3. Architecture

```
Browser (React SPA, :5173)
   │  fetch('/api/...') + Authorization: Bearer <JWT>
   ▼
Vite dev proxy ──► Express API (:5050)
                     ├─ express.json, protect / optionalAuth / authorize(roles)
                     ├─ routes → controllers (asyncHandler + ApiError)
                     └─ Mongoose models ──► MongoDB (memory or MONGO_URI)
```

- **Errors:** every controller is wrapped in `asyncHandler` and throws `ApiError(status, message)` for expected errors. The central `errorHandler` maps `CastError` to 400 "Invalid id", `ValidationError` to 400 and duplicate key `11000` to 400. Anything else returns 500. Unknown `/api` routes return 404 JSON.
- **Client:** `api/api.js` is the single fetch wrapper. It adds the JSON headers and the Bearer token from `localStorage.learnhub_token`, and throws `Error(message)` on a non-2xx status. `AuthContext` loads `/auth/me` on start and provides `login`, `register` and `logout`. `ProtectedRoute` guards routes by role.

## 4. Data model

```
User(instructor) 1───* Course 1───* Module(embedded) *───* Lesson(ref)
User(student)    1───* Enrollment *───1 Course        Enrollment.completedLessons → Lesson
Course 1───* Quiz(questions embedded) 1───* Attempt *───1 User(student)
```

| Collection | Key fields |
|---|---|
| User | name, email (unique, lowercase), password (bcrypt, `select:false`), role, isBlocked |
| Course | title, description, category, price, thumbnail, instructor, status (pending/approved/blocked), modules[{title, order, lessons[ObjectId]}] |
| Lesson | course, title, content, videoUrl, duration, order |
| Enrollment | student, course, completedLessons[], progress; unique `{student, course}` |
| Quiz | course, lesson?, title, passMark, questions[{question, options[], correctIndex}] |
| Attempt | student, quiz, course, answers[], score, total, percentage, passed |

**Why embedded vs referenced?**

- **Modules are embedded.** They are small, always read with the course, never queried alone, and ordered. One read returns the whole outline.
- **Lessons are referenced.** They can be large, are edited independently, are loaded one at a time, and completion is tracked per lesson ID. Embedding them would bloat every course read and risk the 16 MB document limit.
- **Questions are embedded.** They belong to exactly one quiz and are loaded and graded together.
- **Enrollment and Attempt are their own collections.** They grow without limit, and the analytics aggregate over them.

## 5. Business rules

1. Public registration always creates a **student**. Only an admin can create instructors or admins.
2. A blocked user gets a 403 at login and on every protected request.
3. New courses are **pending**. Only **approved** courses are listed and can be enrolled in. A non-approved course returns 404 to everyone except its instructor and admins.
4. Only the owner or an admin can edit or delete a course and manage its modules, lessons and quizzes. Deleting a course cascades to its lessons, quizzes, attempts and enrolments. Deleting a module deletes its lessons.
5. Lesson content and quizzes are visible only to enrolled students, the instructor and admins. The outline is public.
6. `progress = round(completed / totalLessons × 100)`. It is recalculated on completion and for every enrolment when lessons are added or deleted. Completing a lesson twice doesn't double-count.
7. Quizzes are validated: at least 1 question, at least 2 options each, and `correctIndex` in range. `correctIndex` is stripped for students. Grading happens on the server, every attempt is stored, and the response includes a review.
8. An admin can't block themselves or change their own role.

## 6. Analytics (aggregation)

`GET /api/analytics/instructor` runs two pipelines.

- **Per course:** `Course.aggregate` with `$match` on the instructor, `$lookup` on enrollments, `$lookup` on attempts, then `$project` to get the enrolment count, average progress, attempt count and average quiz score.
- **Per quiz:** `Attempt.aggregate` with `$match` on the instructor's courses, then `$group` by quiz (attempts, avgScore, passCount), then `$lookup` for the quiz and course titles, then `$project` to get `passRate = passCount / attempts × 100`.

The totals are the course count, enrolments, attempts, and the average quiz score weighted by attempts.

## 7. Demo script

1. **Student** (`student@learnhub.com`): browse the catalogue, open *React for Beginners* and enrol. In the player, mark 2 lessons complete and watch the progress bar. Take the *React Hooks Quiz* and see the score, pass/fail and the review.
2. **Instructor** (`riya@learnhub.com`): look at the dashboard analytics. Create a course (it shows *pending*), add a module and a lesson, and create a quiz.
3. **Admin** (`admin@learnhub.com`): approve the new course and *Python Data Analysis*. On Users, block and then unblock a user. Check that the approved courses now appear in the public catalogue.

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| `EADDRINUSE :5000` on a Mac | The API uses 5050, because AirPlay takes 5000 |
| `JWT_SECRET is missing` | `cp .env.example .env` in `server/` |
| First start hangs | mongodb-memory-server downloads MongoDB once. Wait, and make sure you have internet |
| Data disappears after a restart | Memory mode is temporary. Use a real `MONGO_URI` and `npm run seed` |
| Logged out after a restart | Memory mode recreates users with new IDs. Log in again |
| API calls return HTML or 404 in dev | Check the `vite.config.js` proxy and that the API is running on 5050 |
| `npm audit` warnings in the client | These are dev-server-only advisories. Don't run `npm audit fix --force` |

## 9. Viva quick answers

- **Embedded vs referenced?** Modules and questions are embedded because they are small and always read together. Lessons are referenced because they are large, independent and tracked per ID.
- **How is progress calculated?** Completed lessons ÷ total lessons × 100. It's recalculated on completion and when lessons are added or deleted.
- **Why grade on the server?** The client can be tampered with, so answers never reach the student before they submit.
- **How is the API secured?** Passwords are hashed with bcrypt and every request carries a JWT. `protect` checks the token and the blocked flag, `authorize` checks the role, and ownership is checked per course.
- **What does aggregation give you?** MongoDB computes the analytics in one round trip instead of looping over documents in JavaScript.
- **Why are new courses pending?** Admin moderation: content is reviewed before students can see it.
