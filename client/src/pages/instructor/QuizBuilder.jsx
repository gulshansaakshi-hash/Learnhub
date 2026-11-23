import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import Loader, { ErrorBox } from '../../components/Loader.jsx';

const blankQuestion = () => ({ question: '', options: ['', ''], correctIndex: 0 });

export default function QuizBuilder() {
  const { courseId: newForCourse, quizId } = useParams();
  const editing = Boolean(quizId);
  const navigate = useNavigate();
  const [courseId, setCourseId] = useState(newForCourse);
  const [course, setCourse] = useState(null);
  const [title, setTitle] = useState('');
  const [passMark, setPassMark] = useState(50);
  const [lesson, setLesson] = useState('');
  const [questions, setQuestions] = useState([blankQuestion()]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const loadCourse = (cid) => api.get(`/courses/${cid}`).then((d) => setCourse(d.course));
    (async () => {
      try {
        if (editing) {
          const { quiz } = await api.get(`/quizzes/${quizId}`);
          setCourseId(quiz.course);
          setTitle(quiz.title);
          setPassMark(quiz.passMark);
          setLesson(quiz.lesson || '');
          setQuestions(quiz.questions.map((q) => ({ question: q.question, options: [...q.options], correctIndex: q.correctIndex })));
          await loadCourse(quiz.course);
        } else {
          await loadCourse(newForCourse);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [editing, quizId, newForCourse]);

  const updateQ = (qi, patch) => setQuestions(questions.map((q, i) => (i === qi ? { ...q, ...patch } : q)));
  const updateOption = (qi, oi, value) =>
    updateQ(qi, { options: questions[qi].options.map((o, i) => (i === oi ? value : o)) });
  const addOption = (qi) => updateQ(qi, { options: [...questions[qi].options, ''] });
  const removeOption = (qi, oi) => {
    const q = questions[qi];
    if (q.options.length <= 2) return;
    const options = q.options.filter((_, i) => i !== oi);
    let correctIndex = q.correctIndex;
    if (oi === correctIndex) correctIndex = 0;
    else if (oi < correctIndex) correctIndex -= 1;
    updateQ(qi, { options, correctIndex });
  };
  const removeQuestion = (qi) => questions.length > 1 && setQuestions(questions.filter((_, i) => i !== qi));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { title, passMark: Number(passMark), lesson: lesson || undefined, questions };
    try {
      if (editing) await api.put(`/quizzes/${quizId}`, { ...body, lesson: lesson || null });
      else await api.post('/quizzes', { ...body, course: courseId });
      navigate(`/instructor/courses/${courseId}`);
    } catch (err) {
      setError(err);
      setBusy(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (loading) return <Loader />;
  if (!course) return <ErrorBox error={error || 'Course not found'} />;

  const lessons = course.modules.flatMap((m) => m.lessons);

  return (
    <div className="narrow">
      <Link to={`/instructor/courses/${courseId}`} className="muted small">← Back to {course.title}</Link>
      <h1>{editing ? 'Edit quiz' : 'New quiz'}</h1>
      <ErrorBox error={error} />
      <form onSubmit={submit}>
        <div className="card form">
          <label>Quiz title<input value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
          <div className="form-row">
            <label>Pass mark (%)<input type="number" min="0" max="100" value={passMark} onChange={(e) => setPassMark(e.target.value)} /></label>
            <label>
              Linked lesson (optional)
              <select value={lesson} onChange={(e) => setLesson(e.target.value)}>
                <option value="">— Whole course —</option>
                {lessons.map((l) => <option key={l._id} value={l._id}>{l.title}</option>)}
              </select>
            </label>
          </div>
        </div>

        {questions.map((q, qi) => (
          <div key={qi} className="card form question-edit">
            <div className="module-head">
              <h3>Question {qi + 1}</h3>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => removeQuestion(qi)} disabled={questions.length === 1}>Remove</button>
            </div>
            <input placeholder="Question text" value={q.question} onChange={(e) => updateQ(qi, { question: e.target.value })} required />
            <p className="muted small">Select the correct answer:</p>
            {q.options.map((o, oi) => (
              <div key={oi} className="option-edit">
                <input type="radio" name={`correct-${qi}`} checked={q.correctIndex === oi} onChange={() => updateQ(qi, { correctIndex: oi })} aria-label={`Option ${oi + 1} is correct`} />
                <input placeholder={`Option ${oi + 1}`} value={o} onChange={(e) => updateOption(qi, oi, e.target.value)} required />
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => removeOption(qi, oi)} disabled={q.options.length <= 2} aria-label="Remove option">✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => addOption(qi)}>+ Add option</button>
          </div>
        ))}

        <div className="row-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setQuestions([...questions, blankQuestion()])}>+ Add question</button>
          <button className="btn" disabled={busy}>{busy ? 'Saving...' : editing ? 'Save quiz' : 'Create quiz'}</button>
        </div>
      </form>
    </div>
  );
}
