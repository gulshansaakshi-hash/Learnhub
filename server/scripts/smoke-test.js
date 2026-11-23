// End-to-end API smoke test (section 11 of the rebuild plan).
// Start the API in memory mode first (npm run dev), then: npm run test:smoke
// Note: it changes data (creates/deletes courses, blocks a user), so restart
// the memory-mode server afterwards to get the clean seed back.
const BASE = process.env.API_URL || 'http://localhost:5050/api';
let pass = 0;
let fail = 0;

async function call(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function check(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
}

const login = async (email, password) => (await call('POST', '/auth/login', { body: { email, password } })).data.token;

async function main() {
  console.log(`Smoke testing ${BASE}\n`);

  console.log('Auth');
  const health = await call('GET', '/health');
  check('health is ok', health.status === 200 && health.data.status === 'ok');

  const email = `new${Date.now()}@test.com`;
  const reg = await call('POST', '/auth/register', { body: { name: 'New Person', email, password: 'secret1', role: 'admin' } });
  check('register creates a student (role in body ignored)', reg.status === 201 && reg.data.user.role === 'student' && !!reg.data.token);
  check('password is never returned', reg.data.user && reg.data.user.password === undefined);
  const dup = await call('POST', '/auth/register', { body: { name: 'X', email, password: 'secret1' } });
  check('duplicate email rejected', dup.status === 400);

  const seeds = [
    ['admin@learnhub.com', 'admin123'], ['riya@learnhub.com', 'instructor123'], ['arjun@learnhub.com', 'instructor123'],
    ['student@learnhub.com', 'student123'], ['priya@learnhub.com', 'student123'], ['rahul@learnhub.com', 'student123'],
  ];
  const tokens = {};
  for (const [e, p] of seeds) tokens[e] = await login(e, p);
  check('all 6 seed users can log in', Object.values(tokens).every(Boolean));
  check('bad password gives 401', (await call('POST', '/auth/login', { body: { email: 'admin@learnhub.com', password: 'nope' } })).status === 401);
  check('missing token gives 401', (await call('GET', '/auth/me')).status === 401);
  const me = await call('GET', '/auth/me', { token: tokens['student@learnhub.com'] });
  check('/auth/me returns the user', me.status === 200 && me.data.user.email === 'student@learnhub.com');

  const admin = tokens['admin@learnhub.com'];
  const riya = tokens['riya@learnhub.com'];
  const arjun = tokens['arjun@learnhub.com'];
  const student = tokens['student@learnhub.com'];
  const rahul = tokens['rahul@learnhub.com'];

  console.log('\nCatalogue');
  const cat = await call('GET', '/courses');
  check('public catalogue shows exactly 3 approved courses', cat.data.courses?.length === 3 && cat.data.courses.every((c) => c.status === 'approved'));
  check('categories list returned', Array.isArray(cat.data.categories) && cat.data.categories.length > 0);
  const search = await call('GET', '/courses?search=react');
  check('search filters the catalogue', search.data.courses?.length === 1 && search.data.courses[0].title === 'React for Beginners');
  const pendingList = await call('GET', '/admin/courses?status=pending', { token: admin });
  const pending = pendingList.data.courses?.find((c) => c.title === 'Python Data Analysis');
  check('pending course exists for admin', !!pending);
  check('pending course detail is 404 for the public', (await call('GET', `/courses/${pending._id}`)).status === 404);
  check('pending course detail is visible to its instructor', (await call('GET', `/courses/${pending._id}`, { token: arjun })).status === 200);

  console.log('\nEnrolment & progress');
  const react = cat.data.courses.find((c) => c.title === 'React for Beginners');
  const enr = await call('POST', `/enrollments/${react._id}`, { token: student });
  check('student enrols in an approved course', enr.status === 201);
  check('duplicate enrolment gives 400', (await call('POST', `/enrollments/${react._id}`, { token: student })).status === 400);
  check('cannot enrol in a pending course', (await call('POST', `/enrollments/${pending._id}`, { token: student })).status === 404);
  const detail = await call('GET', `/courses/${react._id}`, { token: student });
  check('course detail includes the enrolment', !!detail.data.enrollment);
  const lessonId = detail.data.course.modules[0].lessons[0]._id;
  const lesson = await call('GET', `/lessons/${lessonId}`, { token: student });
  check('enrolled student can read lesson content', lesson.status === 200 && !!lesson.data.lesson.content);
  const mongoCourse = cat.data.courses.find((c) => c.title === 'MongoDB & Mongoose');
  const mongoDetail = await call('GET', `/courses/${mongoCourse._id}`);
  check('guest cannot read lesson content', (await call('GET', `/lessons/${mongoDetail.data.course.modules[0].lessons[0]._id}`)).status === 401);
  check('non-enrolled student gets 403 on lesson', (await call('GET', `/lessons/${mongoDetail.data.course.modules[0].lessons[0]._id}`, { token: rahul })).status === 403);
  const c1 = await call('POST', `/enrollments/${react._id}/complete/${lessonId}`, { token: student });
  check('completing a lesson raises progress', c1.status === 200 && c1.data.progress === 17);
  const c2 = await call('POST', `/enrollments/${react._id}/complete/${lessonId}`, { token: student });
  check('completing it again changes nothing', c2.data.progress === 17 && c2.data.enrollment.completedLessons.length === 1);
  const foreign = mongoDetail.data.course.modules[0].lessons[0]._id;
  check('lesson from another course is rejected', (await call('POST', `/enrollments/${react._id}/complete/${foreign}`, { token: student })).status === 400);
  const mine = await call('GET', '/enrollments/me', { token: student });
  check('my enrolments lists courses with instructor', mine.data.enrollments?.length === 3 && !!mine.data.enrollments[0].course.instructor.name);

  console.log('\nQuizzes');
  const quizId = detail.data.quizzes[0]._id;
  const quiz = await call('GET', `/quizzes/${quizId}`, { token: student });
  check('student quiz has no correctIndex', quiz.status === 200 && quiz.data.quiz.questions.every((q) => q.correctIndex === undefined));
  check('instructor sees correctIndex', (await call('GET', `/quizzes/${quizId}`, { token: riya })).data.quiz.questions.every((q) => Number.isInteger(q.correctIndex)));
  const att = await call('POST', `/quizzes/${quizId}/attempt`, { token: student, body: { answers: [1, 2, 1] } });
  check('submission graded on the server (2/3 = 67%, pass)', att.status === 201 && att.data.attempt.score === 2 && att.data.attempt.percentage === 67 && att.data.attempt.passed === true);
  check('review reveals the correct answers', att.data.review?.length === 3 && att.data.review[2].correctIndex === 0 && att.data.review[2].correct === false);
  const att2 = await call('POST', `/quizzes/${quizId}/attempt`, { token: student, body: { answers: [0, 0, 1] } });
  check('a 0/3 submission fails', att2.data.attempt?.passed === false && att2.data.attempt.percentage === 0);
  const my = await call('GET', `/quizzes/${quizId}/attempts/me`, { token: student });
  check('attempts stored, newest first', my.data.attempts?.length === 2 && my.data.attempts[0].percentage === 0);
  check('non-enrolled student cannot fetch the quiz', (await call('GET', `/quizzes/${mongoDetail.data.quizzes[0]._id}`, { token: rahul })).status === 403);
  const badQuiz = await call('POST', '/quizzes', { token: riya, body: { course: react._id, title: 'Bad', questions: [{ question: 'Q', options: ['a'], correctIndex: 0 }] } });
  check('quiz with < 2 options rejected', badQuiz.status === 400);
  const badIdx = await call('POST', '/quizzes', { token: riya, body: { course: react._id, title: 'Bad', questions: [{ question: 'Q', options: ['a', 'b'], correctIndex: 5 }] } });
  check('quiz with out-of-range correctIndex rejected', badIdx.status === 400);

  console.log('\nOwnership & roles');
  check("another instructor editing Riya's course gets 403", (await call('PUT', `/courses/${react._id}`, { token: arjun, body: { title: 'Hacked' } })).status === 403);
  check('student creating a course gets 403', (await call('POST', '/courses', { token: student, body: { title: 'X', description: 'Y' } })).status === 403);
  check('student calling admin API gets 403', (await call('GET', '/admin/stats', { token: student })).status === 403);
  check('invalid id gives 400', (await call('GET', '/courses/not-an-id')).status === 400);
  check('unknown API route gives 404 JSON', (await call('GET', '/nope')).status === 404);

  console.log('\nInstructor course building');
  const created = await call('POST', '/courses', { token: riya, body: { title: 'Temp Course', description: 'Temporary', status: 'approved' } });
  check('new course starts pending (status in body ignored)', created.status === 201 && created.data.course.status === 'pending');
  const tempId = created.data.course._id;
  const mod = await call('POST', `/courses/${tempId}/modules`, { token: riya, body: { title: 'Module A' } });
  const moduleId = mod.data.course?.modules[0]._id;
  check('module added (embedded)', mod.status === 201 && !!moduleId);
  const ren = await call('PUT', `/courses/${tempId}/modules/${moduleId}`, { token: riya, body: { title: 'Module A2' } });
  check('module renamed', ren.data.course?.modules[0].title === 'Module A2');
  const l1 = await call('POST', `/courses/${tempId}/modules/${moduleId}/lessons`, { token: riya, body: { title: 'L1', content: 'hello' } });
  const l2 = await call('POST', `/courses/${tempId}/modules/${moduleId}/lessons`, { token: riya, body: { title: 'L2', content: 'world' } });
  check('lessons added (referenced)', l1.status === 201 && l2.status === 201 && l2.data.course.modules[0].lessons.length === 2);
  check('lesson edited', (await call('PUT', `/lessons/${l1.data.lesson._id}`, { token: riya, body: { title: 'L1 edited' } })).data.lesson?.title === 'L1 edited');
  const q = await call('POST', '/quizzes', { token: riya, body: { course: tempId, title: 'Temp Quiz', passMark: 50, questions: [{ question: 'Q1', options: ['a', 'b'], correctIndex: 1 }] } });
  check('quiz created', q.status === 201);
  check('temp course hidden from public catalogue', !(await call('GET', '/courses')).data.courses.some((c) => c._id === tempId));

  console.log('\nAdmin');
  const appr = await call('PATCH', `/admin/courses/${tempId}/status`, { token: admin, body: { status: 'approved' } });
  check('admin approves the new course', appr.data.course?.status === 'approved');
  check('approved course appears publicly', (await call('GET', '/courses')).data.courses.some((c) => c._id === tempId));

  // Progress recalculation when lessons are added/removed
  await call('POST', `/enrollments/${tempId}`, { token: student });
  const p1 = await call('POST', `/enrollments/${tempId}/complete/${l1.data.lesson._id}`, { token: student });
  check('progress 50% after 1 of 2 lessons', p1.data.progress === 50);
  await call('POST', `/courses/${tempId}/modules/${moduleId}/lessons`, { token: riya, body: { title: 'L3' } });
  const afterAdd = await call('GET', `/courses/${tempId}`, { token: student });
  check('adding a lesson recalculates progress (33%)', afterAdd.data.enrollment?.progress === 33);
  await call('DELETE', `/lessons/${l1.data.lesson._id}`, { token: riya });
  const afterDel = await call('GET', `/courses/${tempId}`, { token: student });
  check('deleting a completed lesson recalculates progress (0%)', afterDel.data.enrollment?.progress === 0 && afterDel.data.enrollment.completedLessons.length === 0);
  await call('POST', `/quizzes/${q.data.quiz._id}/attempt`, { token: student, body: { answers: [1] } });

  const blk = await call('PATCH', `/admin/courses/${react._id}/status`, { token: admin, body: { status: 'blocked' } });
  check('admin blocks a course', blk.data.course?.status === 'blocked');
  check('blocked course disappears from catalogue', !(await call('GET', '/courses')).data.courses.some((c) => c._id === react._id));
  await call('PATCH', `/admin/courses/${react._id}/status`, { token: admin, body: { status: 'approved' } });
  const approvePy = await call('PATCH', `/admin/courses/${pending._id}/status`, { token: admin, body: { status: 'approved' } });
  check('admin approves Python Data Analysis', approvePy.data.course?.status === 'approved' && (await call('GET', `/courses/${pending._id}`)).status === 200);

  const users = await call('GET', '/admin/users?role=student', { token: admin });
  const rahulUser = users.data.users?.find((u) => u.email === 'rahul@learnhub.com');
  check('admin lists users by role', users.data.users?.every((u) => u.role === 'student'));
  await call('PATCH', `/admin/users/${rahulUser._id}`, { token: admin, body: { isBlocked: true } });
  check("blocked user's next request (valid token) gives 403", (await call('GET', '/auth/me', { token: rahul })).status === 403);
  check('blocked user cannot log in (403)', (await call('POST', '/auth/login', { body: { email: 'rahul@learnhub.com', password: 'student123' } })).status === 403);
  await call('PATCH', `/admin/users/${rahulUser._id}`, { token: admin, body: { isBlocked: false } });
  check('unblocked user can use the API again', (await call('GET', '/auth/me', { token: rahul })).status === 200);
  const adminMe = (await call('GET', '/auth/me', { token: admin })).data.user;
  check('admin cannot block themselves', (await call('PATCH', `/admin/users/${adminMe._id}`, { token: admin, body: { isBlocked: true } })).status === 400);
  check('admin cannot change their own role', (await call('PATCH', `/admin/users/${adminMe._id}`, { token: admin, body: { role: 'student' } })).status === 400);
  const newInst = await call('POST', '/admin/users', { token: admin, body: { name: 'New Instructor', email: `inst${Date.now()}@test.com`, password: 'secret1', role: 'instructor' } });
  check('admin creates an instructor', newInst.status === 201 && newInst.data.user.role === 'instructor');
  const stats = await call('GET', '/admin/stats', { token: admin });
  check('admin stats return counts', stats.data.stats?.users.admin === 1 && stats.data.stats.courses.total === 5);

  console.log('\nAnalytics');
  const an = await call('GET', '/analytics/instructor', { token: riya });
  const anReact = an.data.perCourse?.find((c) => c.title === 'React for Beginners');
  check('analytics returns totals, perCourse, perQuiz', !!an.data.totals && Array.isArray(an.data.perCourse) && Array.isArray(an.data.perQuiz));
  check('analytics: React has 3 enrolments and 4 attempts', anReact?.enrollments === 3 && anReact.attempts === 4);
  // React attempts: Priya 67%, Rahul 0% (seed) + Student 67%, 0% (above) → avg 33.5
  check('analytics: React average quiz score is 33.5%', anReact?.avgQuizScore === 33.5, JSON.stringify(anReact));
  const hooksQuiz = an.data.perQuiz?.find((x) => x.quizTitle === 'React Hooks Quiz');
  check('analytics: per-quiz pass rate computed', hooksQuiz?.attempts === 4 && hooksQuiz.passRate === 50, JSON.stringify(hooksQuiz));
  check('instructor analytics are only their own courses', an.data.perCourse.every((c) => c.title !== 'MongoDB & Mongoose'));

  console.log('\nCascade delete');
  const del = await call('DELETE', `/courses/${tempId}`, { token: riya });
  check('instructor deletes their course', del.status === 200);
  check('course gone (404)', (await call('GET', `/courses/${tempId}`, { token: admin })).status === 404);
  check('its lessons are gone', (await call('GET', `/lessons/${l2.data.lesson._id}`, { token: admin })).status === 404);
  check('its quizzes are gone', (await call('GET', `/quizzes/${q.data.quiz._id}`, { token: admin })).status === 404);
  check('its enrolments are gone', !(await call('GET', '/enrollments/me', { token: student })).data.enrollments.some((e) => e.course._id === tempId));
  const an2 = await call('GET', '/analytics/instructor', { token: riya });
  check('its attempts are gone (not in analytics)', !an2.data.perQuiz.some((x) => x.quizTitle === 'Temp Quiz'));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
}

main().catch((err) => {
  console.error('Smoke test crashed:', err.message);
  process.exitCode = 1;
});
