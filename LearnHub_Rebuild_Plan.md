# LearnHub: Rebuild Plan (Plans, Steps & Deliverables)

This document is a complete blueprint for rebuilding **LearnHub**, a MERN stack Learning Management System, from an empty folder. It describes exactly what the finished project contains: the data model, the API, the pages, business rules, seed data, the build order, test checks and the final deliverables.

Use it in either of two ways:
- **By hand:** follow the phases in section 10 in order. Each phase lists what to build, what you should have at the end of it, and how to check it.
- **With an AI coding assistant:** paste the prompt in section 0 and attach or paste this file.

---

## 0. Prompt to give an AI coding assistant

> Build the full-stack project described in the attached `LearnHub_Rebuild_Plan.md`, from an empty folder, exactly as specified. Treat that file as the source of truth for the folder structure, data models, API routes, business rules, pages, seed data and deliverables.
>
> Work through the build phases in section 10 in order. After each phase, run that phase's acceptance checks and fix anything that fails before moving on.
>
> Requirements:
> - Backend: Node.js + Express 4 + Mongoose 8, using ES modules (`"type": "module"`). Use bcrypt for passwords and jsonwebtoken for auth. Use dotenv for config. Use `mongodb-memory-server` when `MONGO_URI=memory`, which also auto-seeds the demo data.
> - Frontend: React 18 + Vite 5 + react-router-dom 6. Use the Fetch API, wrapped in one helper. Use the Context API for auth state. No UI library; use plain CSS that works on mobile.
> - The API runs on port **5050** (not 5000, which macOS AirPlay uses). Vite runs on 5173 and proxies `/api` to 5050.
> - Grade quizzes **on the server**, and never send `correctIndex` to students before they submit.
> - Course modules are **embedded** in Course. Lessons are **referenced** by ObjectId. Quiz questions are **embedded**.
> - Instructor analytics must use MongoDB **aggregation pipelines** (`$lookup`, `$group`, `$project`).
> - Write `server/.env.example`, a root `.gitignore` (node_modules, .env, client/dist, .DS_Store), a `README.md` with run steps and demo logins, and the seed script with the demo accounts in section 9.
>
> When you're done, start both servers. Then run the end-to-end checks in section 11 for all three roles and report the result of each check.

---

## 1. Project goal & scope

LearnHub is an online learning platform with three roles:

| Role | What they can do |
|---|---|
| **Student** | Browse and search approved courses, enrol, read lessons, mark lessons complete (progress %), take quizzes (auto-graded, attempts stored), see their courses and progress. |
| **Instructor** | Create courses (these start as *pending*), add/edit/delete modules and lessons, create and edit quizzes, and see analytics (enrolments per course, average progress, average quiz score, quiz pass rate). |
| **Admin** | Approve, block or reset courses; view all courses with a status filter; manage users (block/unblock, change role, create instructors); see platform stats. |

**Brief requirements this must satisfy:**
- express, mongoose, dotenv, bcrypt, jsonwebtoken / react, react-router-dom, Fetch API, Context API.
- Role-based access (admin, instructor, student).
- Course → Module → Lesson management, showing **embedded vs referenced** modelling.
- Enrolment with lesson-completion progress tracking.
- Quizzes with automatic grading and stored attempts.
- Instructor analytics via **aggregation**.
- Admin approval and blocking of courses.
- Collections: **User, Course, Lesson, Enrollment, Quiz, Attempt**.

**Out of scope (possible future work):** payments, file/video uploads (lessons take a video URL), email verification, password reset, certificates, discussion forums.

---

## 2. Tech stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | 18+ (20 LTS recommended) | Runs the server; `node --watch` for dev |
| Server | Express | ^4.21 | REST API |
| ODM | Mongoose | ^8.9 | Schemas, validation, aggregation |
| Database | MongoDB | via `mongodb-memory-server` ^10 or a real URI | Data storage |
| Auth | jsonwebtoken ^9, bcrypt ^6 | | JWT bearer tokens; password hashing (10 salt rounds) |
| Config | dotenv ^16 | | Loads `server/.env` |
| Client | React ^18.3 + react-dom | | UI |
| Routing | react-router-dom ^6.28 | | Client-side routes and role guards |
| Build/dev | Vite ^5.4 + @vitejs/plugin-react ^4.3 | | Dev server on 5173 with `/api` proxy |
| HTTP | Fetch API | built in | Wrapped in `client/src/api/api.js` |
| State | Context API | built in | `AuthContext` (user, token, login/logout) |

---

## 3. Architecture

```
Browser (React SPA, :5173)
   │  fetch('/api/...')  +  Authorization: Bearer <JWT>
   ▼
Vite dev proxy  ──►  Express API (:5050)
                       ├─ middleware: express.json, protect / optionalAuth / authorize(roles)
                       ├─ routes → controllers (asyncHandler + ApiError)
                       └─ Mongoose models
                             ▼
                       MongoDB (in-memory or MONGO_URI)
```

- **Dev:** two processes, Vite on 5173 and Express on 5050. Vite forwards `/api` to Express.
- **Production:** run `npm run build` in `client/`. If `client/dist` exists, Express serves it as static files, with a catch-all for non-`/api` routes that returns `index.html`. That gives one server and one port.
- **Errors:** every controller is wrapped in `asyncHandler`. Throw `new ApiError(status, message)` for expected errors. The central `errorHandler` maps Mongoose `CastError` to 400 ("Invalid id"), `ValidationError` to 400 (with the messages joined), and duplicate key `11000` to 400. Any other error returns 500. Unknown `/api` routes return 404 JSON.
- **Response shape:** JSON objects with a named key, e.g. `{ course }`, `{ courses, categories }`, `{ token, user }`, `{ message }`.

---

## 4. Folder structure (final)

```
learnhub/
├── .gitignore
├── README.md
├── LearnHub_Project_Guide.md        # shareable guide (run steps, schema, viva Q&A)
├── server/
│   ├── package.json                 # scripts: start, dev (node --watch), seed
│   ├── .env.example                 # PORT, MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN
│   ├── server.js                    # app setup, routes, static client, start
│   ├── seed.js                      # exports seedDatabase(); runnable via npm run seed
│   ├── config/db.js                 # connectDB(): memory server or MONGO_URI
│   ├── middleware/
│   │   ├── auth.js                  # signToken, protect, optionalAuth, authorize
│   │   └── error.js                 # asyncHandler, ApiError, notFound, errorHandler
│   ├── models/
│   │   ├── User.js  Course.js  Lesson.js
│   │   └── Enrollment.js  Quiz.js  Attempt.js
│   ├── controllers/
│   │   ├── helpers.js               # isOwner, loadOwnedCourse, canAccessContent, recalcProgress
│   │   ├── authController.js  courseController.js  lessonController.js
│   │   ├── enrollmentController.js  quizController.js
│   │   └── analyticsController.js  adminController.js
│   └── routes/
│       ├── authRoutes.js  courseRoutes.js  lessonRoutes.js  enrollmentRoutes.js
│       └── quizRoutes.js  analyticsRoutes.js  adminRoutes.js
└── client/
    ├── package.json  vite.config.js  index.html
    └── src/
        ├── main.jsx                 # BrowserRouter + AuthProvider
        ├── App.jsx                  # route table
        ├── index.css                # all styling (responsive)
        ├── api/api.js               # fetch wrapper, token in localStorage
        ├── context/AuthContext.jsx  # AuthProvider, useAuth, homeFor(role)
        ├── components/
        │   ├── Navbar.jsx  ProtectedRoute.jsx  Loader.jsx (Loader + ErrorBox)
        │   └── ProgressBar.jsx  CourseCard.jsx (CourseCard + Thumb)
        └── pages/
            ├── Home.jsx  CourseDetail.jsx  Login.jsx  Register.jsx  NotFound.jsx
            ├── student/    MyCourses.jsx  CoursePlayer.jsx  QuizPage.jsx
            ├── instructor/ Dashboard.jsx  CourseForm.jsx  CourseBuilder.jsx  QuizBuilder.jsx
            └── admin/      AdminCourses.jsx  AdminUsers.jsx
```

---

## 5. Configuration

`server/.env.example` (copy it to `server/.env`):
```
PORT=5050
MONGO_URI=memory
JWT_SECRET=change_this_to_a_long_random_string
JWT_EXPIRES_IN=7d
```
- `MONGO_URI=memory` starts an in-memory MongoDB and **auto-seeds** it on every start. The data resets on restart.
- For a real database, set `MONGO_URI=mongodb://127.0.0.1:27017/learnhub` (or an Atlas URI) and run `npm run seed` once.
- If `JWT_SECRET` is missing, the server must exit with a clear message: *"JWT_SECRET is missing. Copy .env.example to .env first."*

`client/vite.config.js`: React plugin, `server.port = 5173`, `server.proxy = { '/api': 'http://localhost:5050' }`.

`.gitignore`: `node_modules/`, `.env`, `client/dist/`, `.DS_Store`.

---

## 6. Data model (6 collections)

All schemas use `{ timestamps: true }` (`createdAt`, `updatedAt`).

### 6.1 User
| Field | Type | Rules |
|---|---|---|
| name | String | required, trim |
| email | String | required, **unique**, lowercase, trim |
| password | String | required, minlength 6, **`select: false`**, hashed with bcrypt in `pre('save')` only when modified |
| role | String | enum `admin`, `instructor`, `student`; default `student` |
| isBlocked | Boolean | default `false` |

- Method `matchPassword(plain)` returns `bcrypt.compare`.
- A `toJSON` transform deletes `password`.

### 6.2 Course (modules **embedded**)
| Field | Type | Rules |
|---|---|---|
| title | String | required, trim |
| description | String | required |
| category | String | default `General` |
| price | Number | default 0, min 0 |
| thumbnail | String | URL, default `''` |
| instructor | ObjectId → User | required |
| status | String | enum `pending`, `approved`, `blocked`; default `pending` |
| modules | [moduleSchema] | **embedded sub-documents** |

`moduleSchema`: `{ title (required), order (Number), lessons: [ObjectId → Lesson] }`

Method `lessonCount()` returns the total number of lessons across all modules.

### 6.3 Lesson (**referenced** from Course.modules[].lessons)
| Field | Type | Rules |
|---|---|---|
| course | ObjectId → Course | required |
| title | String | required |
| content | String | lesson text |
| videoUrl | String | optional (YouTube embed URL etc.) |
| duration | Number | minutes |
| order | Number | |

### 6.4 Enrollment
| Field | Type | Rules |
|---|---|---|
| student | ObjectId → User | required |
| course | ObjectId → Course | required |
| completedLessons | [ObjectId → Lesson] | |
| progress | Number | 0–100 |

**Unique compound index** `{ student: 1, course: 1 }`, so a student can enrol only once.

### 6.5 Quiz (questions **embedded**)
| Field | Type | Rules |
|---|---|---|
| course | ObjectId → Course | required |
| lesson | ObjectId → Lesson | optional |
| title | String | required |
| passMark | Number | percentage 0–100, default 50 |
| questions | [{ question, options: [String] (≥2), correctIndex: Number }] | embedded |

### 6.6 Attempt
| Field | Type |
|---|---|
| student → User, quiz → Quiz, course → Course | ObjectId (required) |
| answers | [Number] (chosen option index per question) |
| score, total, percentage | Number |
| passed | Boolean (`percentage >= quiz.passMark`) |

### 6.7 Relationships (ER summary)
```
User(instructor) 1───* Course 1───* Module(embedded) *───* Lesson(ref)
User(student)    1───* Enrollment *───1 Course        Enrollment.completedLessons → Lesson
Course 1───* Quiz(questions embedded) 1───* Attempt *───1 User(student)
```

### 6.8 Why embedded vs referenced (explain this in the viva)
- **Modules are embedded:** they are small, always read together with their course, never queried alone, and their order matters. One read returns the whole course outline.
- **Lessons are referenced:** their content can be large, they are edited on their own, they are loaded one at a time in the player, and completion is tracked per lesson ID. Embedding them would bloat every course read and risk the 16 MB document limit.
- **Quiz questions are embedded:** they belong to exactly one quiz and are always loaded and graded together.
- **Enrollment and Attempt are separate collections:** they grow without limit (one per student per course, many per quiz) and are what the analytics aggregate over.

---

## 7. Business rules (must hold)

**Auth**
1. Public registration **always creates a student** (any `role` in the body is ignored). Only an admin can create instructors or admins.
2. Login returns `{ token, user }`. The JWT payload is `{ id, role }` and it expires after `JWT_EXPIRES_IN`.
3. Blocked users get a 403 at login, and also on every protected request, even with a valid token.

**Courses**

4. New courses are always `pending`. Only **approved** courses appear in the public catalogue and can be enrolled in.
5. Course detail for a non-approved course returns 404, unless the requester is its instructor or an admin.
6. Only the course's own instructor (or an admin) can edit it, delete it, or manage its modules, lessons and quizzes (`loadOwnedCourse`, otherwise 403).
7. Deleting a course **cascades**: lessons, quizzes, attempts and enrolments for that course. Deleting a module deletes its lessons.

**Content access**

8. Lesson content and quizzes are visible only to enrolled students, the course instructor, or an admin (`canAccessContent`). The course outline (module and lesson titles) is public.

**Progress**

9. `progress = round(completedLessons.length / course.lessonCount() × 100)`. It is recalculated when a lesson is completed, **and** for all enrolments of that course when a lesson is added or deleted. Completing the same lesson twice doesn't double-count it.
10. A lesson can only be completed if it belongs to that course, and only by an enrolled student.

**Quizzes**

11. Creating or updating a quiz validates that there is at least 1 question, that every question has text and at least 2 options, and that `correctIndex` is in range.
12. `GET /quizzes/:id` strips `correctIndex` for anyone who can't manage the course.
13. Grading happens on the server. Every submission is stored as an Attempt. The response includes a `review` that reveals the correct answers after submission.

**Admin**

14. An admin can't block themselves or change their own role.

---

## 8. REST API (all under `/api`)

Auth header: `Authorization: Bearer <token>`. 🔓 = public, 🔑 = any logged-in user, otherwise the listed roles.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | 🔓 | `{ status: 'ok' }` |
| POST | `/auth/register` | 🔓 | `{name,email,password}` → creates a student, returns `{token,user}` |
| POST | `/auth/login` | 🔓 | `{email,password}` → `{token,user}` |
| GET | `/auth/me` | 🔑 | current user |
| GET | `/courses?search=&category=` | 🔓 | approved catalogue + `categories` list |
| GET | `/courses/mine` | instructor | own courses, any status |
| GET | `/courses/:id` | 🔓 (optionalAuth) | detail + outline + quizzes; adds `enrollment` and `canManage` when logged in |
| POST | `/courses` | instructor, admin | create (status `pending`) |
| PUT | `/courses/:id` | owner, admin | update fields |
| DELETE | `/courses/:id` | owner, admin | delete + cascade |
| POST | `/courses/:id/modules` | owner, admin | add module `{title}` |
| PUT | `/courses/:id/modules/:moduleId` | owner, admin | rename or reorder |
| DELETE | `/courses/:id/modules/:moduleId` | owner, admin | delete module + its lessons |
| POST | `/courses/:id/modules/:moduleId/lessons` | owner, admin | add lesson, recalculate progress |
| GET | `/lessons/:id` | 🔑 enrolled, owner, admin | lesson content |
| PUT | `/lessons/:id` | owner, admin | edit lesson |
| DELETE | `/lessons/:id` | owner, admin | delete, pull from module and from completedLessons, recalculate progress |
| GET | `/enrollments/me` | student | my enrolments (course + instructor populated) |
| POST | `/enrollments/:courseId` | student | enrol (approved only, no duplicates) |
| POST | `/enrollments/:courseId/complete/:lessonId` | student | mark complete, returns updated progress |
| POST | `/quizzes` | owner, admin | create `{course,lesson?,title,passMark,questions}` |
| GET | `/quizzes/:id` | 🔑 enrolled, owner, admin | quiz (answers hidden for students) |
| PUT | `/quizzes/:id` | owner, admin | update |
| DELETE | `/quizzes/:id` | owner, admin | delete + its attempts |
| POST | `/quizzes/:id/attempt` | student (enrolled) | `{answers:[idx…]}` → `{attempt, review}` |
| GET | `/quizzes/:id/attempts/me` | student | my past attempts, newest first |
| GET | `/analytics/instructor` | instructor | `{ totals, perCourse, perQuiz }` (aggregation) |
| GET | `/admin/stats` | admin | counts of users by role, courses by status, enrolments, attempts |
| GET | `/admin/courses?status=` | admin | all courses, filterable |
| PATCH | `/admin/courses/:id/status` | admin | `{status: approved, blocked or pending}` |
| GET | `/admin/users?role=` | admin | list users |
| POST | `/admin/users` | admin | create a user with any role |
| PATCH | `/admin/users/:id` | admin | `{isBlocked?, role?}` (not yourself) |

### 8.1 Analytics aggregation (core of the brief)
**Per course:**
```js
Course.aggregate([
  { $match: { instructor: instructorId } },
  { $lookup: { from: 'enrollments', localField: '_id', foreignField: 'course', as: 'enrollments' } },
  { $lookup: { from: 'attempts',    localField: '_id', foreignField: 'course', as: 'attempts' } },
  { $project: {
      title: 1, status: 1,
      enrollments: { $size: '$enrollments' },
      avgProgress: { $round: [{ $ifNull: [{ $avg: '$enrollments.progress' }, 0] }, 1] },
      attempts:    { $size: '$attempts' },
      avgQuizScore:{ $round: [{ $ifNull: [{ $avg: '$attempts.percentage' }, 0] }, 1] } } },
  { $sort: { enrollments: -1 } }
])
```
**Per quiz:** `Attempt.aggregate`, using `$match` on course in the instructor's courses, then `$group` by quiz (`attempts: $sum 1`, `avgScore: $avg percentage`, `passCount: $sum $cond passed`). Then `$lookup` the quiz and course titles and `$project` `passRate = passCount / attempts × 100`.

**Totals:** number of courses, total enrolments, total attempts, and the overall average quiz score weighted by attempts.

---

## 9. Seed data (`server/seed.js`)

`seedDatabase()` wipes all six collections and inserts:

| Role | Name | Email | Password |
|---|---|---|---|
| Admin | Admin User | admin@learnhub.com | admin123 |
| Instructor | Riya Sharma | riya@learnhub.com | instructor123 |
| Instructor | Arjun Mehta | arjun@learnhub.com | instructor123 |
| Student | Student One | student@learnhub.com | student123 |
| Student | Priya Singh | priya@learnhub.com | student123 |
| Student | Rahul Verma | rahul@learnhub.com | student123 |

- **Courses:** 3 approved and 1 pending (for the admin approval demo):
  - *JavaScript Fundamentals*: 2 modules × 3 lessons.
  - *React for Beginners*: 2 × 3.
  - *MongoDB & Mongoose*: 2 × 2.
  - *Python Data Analysis* (pending): 1 module × 2 lessons.

  Lesson content is a short text such as "In this lesson we cover: <topic>".
- **Quizzes:** 3, one per approved course: *JavaScript Basics Quiz* (pass mark 60%), *React Hooks Quiz* (50%) and *Data Modelling Quiz* (50%). They have 9 multiple-choice questions in total.
- **Enrolments:** 5, with different progress values. `student@learnhub.com` is enrolled with partial progress.
- **Attempts:** 3 with different scores, so the analytics show real numbers immediately.

`seed.js` exports `seedDatabase()` (called automatically by `server.js` in memory mode). When run directly (`npm run seed`), it connects using `MONGO_URI`, seeds, and exits.

---

## 10. Build plan (phases, steps, deliverables)

Suggested schedule for a 5-day build. Each phase ends with something working.

### Phase 1: Project setup (Day 1, morning)
**Steps**
1. Create `learnhub/` with `server/` and `client/`. Run `git init` and add `.gitignore`.
2. In `server`: `npm init`, set `"type": "module"`, install express, mongoose, dotenv, bcrypt, jsonwebtoken, and `-D mongodb-memory-server`. Add scripts `start`, `dev` (`node --watch server.js`) and `seed`.
3. Write `.env.example` and copy it to `.env` with a random `JWT_SECRET`.
4. Write `config/db.js` (memory or URI) and `middleware/error.js`.
5. Write `server.js` with `/api/health`, the JWT_SECRET check, and the error middleware.
6. In `client`: `npm create vite@latest client -- --template react`, add react-router-dom, and set up the proxy and port.

**Deliverable:** `npm run dev` starts the API on 5050. `GET /api/health` returns `{status:'ok'}`. The Vite page loads on 5173.

### Phase 2: Models and seed (Day 1, afternoon)
**Steps:** write the 6 models exactly as in section 6, then `seed.js` as in section 9, then call `seedDatabase()` in memory mode.
**Deliverable:** the server logs a successful seed, and the data can be queried.
**Check:** the unique email and unique enrolment indexes reject duplicates, and the password is stored as a bcrypt hash.

### Phase 3: Auth and role middleware (Day 2, morning)
**Steps:** `signToken`, `protect`, `optionalAuth`, `authorize(...roles)`; the auth controller and routes (register, login, me).
**Deliverable:** register, login and `/me` work.
**Check:** wrong password → 401, blocked user → 403, missing token → 401, wrong role → 403, and register with `role:'admin'` still creates a student.

### Phase 4: Courses, modules and lessons API (Day 2, afternoon)
**Steps:** `helpers.js`; course controller (list, mine, get, create, update, delete with cascade, module CRUD); lesson controller (add, get, update, delete with progress recalculation); routes.
**Deliverable:** an instructor can build a full course outline through the API.
**Check:** a pending course is hidden from the public list, a non-owner instructor gets 403, and deleting a course removes its lessons, quizzes, enrolments and attempts.

### Phase 5: Enrolment, progress and quizzes API (Day 3, morning)
**Steps:** enrolment controller (enroll, my enrolments, complete lesson); quiz controller (validate, CRUD, getQuiz hiding answers, submitAttempt with server grading and review, myAttempts).
**Deliverable:** a student can enrol, complete lessons, see progress, and take a quiz that is graded on the server.
**Check:** a duplicate enrolment is rejected, completing the same lesson twice doesn't change progress, a student's quiz response contains no `correctIndex`, and the score and pass result are correct.

### Phase 6: Analytics and admin API (Day 3, afternoon)
**Steps:** the analytics controller using the pipelines in 8.1; the admin controller (stats, list/filter courses, set status, list/create/update users with the self-change guard).
**Deliverable:** `/analytics/instructor` returns real numbers from the seed data, and an admin can approve the pending course.
**Check:** after approval the course appears in the public list, a blocked course disappears, and an admin can't block themselves.

### Phase 7: Frontend foundation (Day 4, morning)
**Steps**
1. `api/api.js`: a `request(method, path, body)` wrapper that adds the JSON headers and Bearer token (`localStorage['learnhub_token']`) and throws `Error(message)` on a non-2xx status.
2. `AuthContext`: loads `/auth/me` on start when a token exists, and provides `login`, `register` and `logout`. `homeFor(role)` maps admin → `/admin`, instructor → `/instructor`, student → `/my-courses`.
3. `ProtectedRoute` (redirects to /login, or to the user's home on a wrong role), `Navbar` (links per role), `Loader`, `ErrorBox`, `ProgressBar`, `CourseCard`.
4. Routes in `App.jsx` (see section 10a).

**Deliverable:** login and logout work, and each role lands on its own home page.

### Phase 8: Pages (Day 4, afternoon to Day 5, morning)
**Public:** Home (search box, category filter, course grid), CourseDetail (outline, quizzes, Enrol button, or "Continue learning" when enrolled), Login (with one-click **demo login buttons** for each role), Register, NotFound.
**Student:** MyCourses (cards with progress bars), CoursePlayer (module/lesson sidebar, lesson content and video embed, "Mark complete", live progress), QuizPage (one question per card, submit, score, pass/fail, review with correct answers, past attempts).
**Instructor:** Dashboard (stat tiles plus per-course and per-quiz analytics tables, my courses with status badges), CourseForm (create/edit), CourseBuilder (add/rename/delete modules, add/edit/delete lessons, list and create quizzes), QuizBuilder (add questions and options, pick the correct answer, set the pass mark).
**Admin:** AdminCourses (stats tiles, status filter tabs, Approve/Block/Reset per course), AdminUsers (role filter, block/unblock, change role, create instructor form).
**Deliverable:** every feature in section 1 can be used from the UI.

### Phase 9: Styling, docs and polish (Day 5, afternoon)
**Steps:** responsive `index.css` (works at phone width); loading and error states on every page; empty states ("No courses yet"); README; shareable project guide.
**Deliverable:** a project that's ready to demo, plus documentation.

### Phase 10: Testing and hand-off (Day 5, evening)
Run every check in section 11. Commit, push to a **private** GitHub repo, and invite collaborators.

### 10a. Client routes
| Path | Page | Access |
|---|---|---|
| `/` | Home | public |
| `/courses/:id` | CourseDetail | public |
| `/login`, `/register` | Login, Register | public |
| `/my-courses` | MyCourses | student |
| `/learn/:courseId` | CoursePlayer | student, instructor, admin |
| `/quiz/:quizId` | QuizPage | student |
| `/instructor` | Dashboard | instructor |
| `/instructor/courses/new` | CourseForm | instructor |
| `/instructor/courses/:id` | CourseBuilder | instructor |
| `/instructor/courses/:courseId/quiz/new` | QuizBuilder (create) | instructor |
| `/instructor/quiz/:quizId` | QuizBuilder (edit) | instructor |
| `/admin` | AdminCourses | admin |
| `/admin/users` | AdminUsers | admin |
| `*` | NotFound | public |

---

## 11. Acceptance test checklist

**API smoke test** (scriptable with fetch; the original build passed 42 of 42):
- [ ] Health OK; register creates a student; login works for all 6 seed users; a bad password gives 401.
- [ ] The public catalogue shows only the 3 approved courses; the pending course is hidden (404 on detail for the public).
- [ ] A student enrols, a duplicate gives 400, a lesson completes, progress rises, and repeating the completion changes nothing.
- [ ] A student fetches a quiz with no `correctIndex`; the submission is graded correctly and an Attempt is stored.
- [ ] Another instructor editing Riya's course gets 403; a student creating a course gets 403.
- [ ] Analytics returns enrolments and the average quiz score for the instructor's courses.
- [ ] An admin approves the pending course and it appears publicly; blocking hides it; blocking a user makes their next request 403; an admin can't block themselves.
- [ ] Deleting a course removes its lessons, quizzes, attempts and enrolments.

**UI walkthrough (demo script):**
1. **Student** (`student@learnhub.com`): browse, open a course, enrol, open the player, mark 2 lessons complete (watch the progress bar), take the quiz, see the score and review.
2. **Instructor** (`riya@learnhub.com`): dashboard analytics, create a course (shows *pending*), add a module and lesson, create a quiz.
3. **Admin** (`admin@learnhub.com`): approve the new course and the pending *Python Data Analysis*; block and unblock a user; the course now shows in the public catalogue.

---

## 12. Final deliverables

| # | Deliverable | Description |
|---|---|---|
| 1 | Source code | `server/` (Express API) + `client/` (React app), structured as in section 4 |
| 2 | Database design | 6 Mongoose models with validation, indexes, embedded and referenced design |
| 3 | REST API | 30+ endpoints with JWT auth and role-based access (section 8) |
| 4 | Frontend | 16 pages across public, student, instructor and admin areas |
| 5 | Analytics | MongoDB aggregation pipelines for instructor insights |
| 6 | Seed data | 6 demo users, 4 courses, 3 quizzes, enrolments and attempts |
| 7 | `README.md` | Run steps, features, data model, API, demo logins |
| 8 | Project guide | Shareable `.md` with architecture, ER diagram, demo flow, troubleshooting, viva Q&A |
| 9 | Config | `.env.example`, `.gitignore`, lock files |
| 10 | Repository | Private GitHub repo with collaborators invited |

---

## 13. How to run (finished project)

Requires Node.js 18 or newer and internet on the first run (npm packages, plus a one-off MongoDB binary download of about 100 MB for memory mode).

```bash
cd learnhub/server && cp .env.example .env && npm install && npm run dev
```
```bash
cd learnhub/client && npm install && npm run dev
```
Open **http://localhost:5173**. On Windows, use `copy .env.example .env`.

Production (single server): `cd client && npm run build`, then `cd ../server && npm start`, then open http://localhost:5050.

---

## 14. Known pitfalls and fixes

| Problem | Cause | Fix |
|---|---|---|
| `EADDRINUSE :5000` on a Mac | AirPlay Receiver uses port 5000 | Use port **5050** (the default here) |
| `JWT_SECRET is missing` | `server/.env` not created | `cp .env.example .env` |
| First start hangs for a while | mongodb-memory-server downloads MongoDB once | Wait; it needs internet |
| Data disappears after a restart | Memory mode is temporary | Use a real `MONGO_URI` + `npm run seed` |
| `npm audit` warnings in the client | Old Vite/esbuild advisories that only affect the dev server | Safe for local dev; don't run `npm audit fix --force` (it jumps Vite major versions). Upgrade Vite deliberately if needed |
| bcrypt install warnings | bcrypt 5's node-pre-gyp | Use bcrypt **^6** |
| API calls return HTML or 404 in dev | Vite proxy missing, or API not running | Check the `vite.config.js` proxy and that the API is on 5050 |
| Logged out after a restart (memory mode) | Users are recreated with new IDs | Log in again |

---

## 15. Viva quick answers

- **Embedded vs referenced?** See 6.8: modules and questions are embedded (small, always read together); lessons are referenced (large, independent, tracked per ID).
- **How is progress calculated?** Completed lessons ÷ total lessons × 100. It's recalculated on completion and whenever lessons are added or deleted.
- **Why grade on the server?** The client could be tampered with. Answers never reach the student before submission.
- **How is the API secured?** bcrypt-hashed passwords; a JWT on every request; `protect` checks the token and the blocked flag; `authorize` checks the role; ownership is checked per course.
- **What does aggregation give you?** The database computes enrolments, average progress, average score and pass rate in one round trip instead of looping in JavaScript.
- **Why are new courses pending?** Admin moderation: content is reviewed before students can see it.
