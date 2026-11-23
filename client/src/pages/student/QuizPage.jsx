import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/api.js';
import Loader, { ErrorBox } from '../../components/Loader.jsx';

export default function QuizPage() {
  const { quizId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [course, setCourse] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const loadAttempts = () =>
    api.get(`/quizzes/${quizId}/attempts/me`).then((d) => setAttempts(d.attempts)).catch(() => {});

  useEffect(() => {
    api
      .get(`/quizzes/${quizId}`)
      .then((d) => {
        setQuiz(d.quiz);
        setCourse(d.course);
        setAnswers(d.quiz.questions.map(() => null));
      })
      .catch(setError);
    loadAttempts();
  }, [quizId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error && !quiz) return <ErrorBox error={error} />;
  if (!quiz) return <Loader />;

  const choose = (qi, oi) => setAnswers(answers.map((a, i) => (i === qi ? oi : a)));
  const unanswered = answers.filter((a) => a === null).length;

  const submit = async (e) => {
    e.preventDefault();
    if (unanswered && !window.confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    setBusy(true);
    setError(null);
    try {
      const d = await api.post(`/quizzes/${quizId}/attempt`, { answers: answers.map((a) => (a === null ? -1 : a)) });
      setResult(d);
      loadAttempts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const retry = () => {
    setResult(null);
    setAnswers(quiz.questions.map(() => null));
  };

  return (
    <div className="quiz">
      <Link to={`/learn/${course._id}`} className="muted small">← Back to {course.title}</Link>
      <h1>{quiz.title}</h1>
      <p className="muted">{quiz.questions.length} questions · pass mark {quiz.passMark}%</p>
      <ErrorBox error={error} />

      {result ? (
        <>
          <div className={`card result ${result.attempt.passed ? 'pass' : 'fail'}`}>
            <h2>{result.attempt.passed ? '🎉 Passed!' : 'Not passed yet'}</h2>
            <p className="score">
              {result.attempt.score} / {result.attempt.total} · <strong>{result.attempt.percentage}%</strong>
            </p>
            <p className="muted">Pass mark: {result.passMark}%</p>
            <button className="btn" onClick={retry}>Try again</button>
          </div>
          <h2>Review</h2>
          {result.review.map((r, qi) => (
            <div key={qi} className={`card question ${r.correct ? 'correct' : 'wrong'}`}>
              <h3>{qi + 1}. {r.question}</h3>
              <ul className="options review">
                {r.options.map((o, oi) => (
                  <li key={oi} className={oi === r.correctIndex ? 'is-correct' : oi === r.chosenIndex ? 'is-wrong' : ''}>
                    {o}
                    {oi === r.correctIndex && ' ✓ correct answer'}
                    {oi === r.chosenIndex && oi !== r.correctIndex && ' ✗ your answer'}
                  </li>
                ))}
              </ul>
              {r.chosenIndex < 0 && <p className="muted small">You didn't answer this question.</p>}
            </div>
          ))}
        </>
      ) : (
        <form onSubmit={submit}>
          {quiz.questions.map((q, qi) => (
            <fieldset key={q._id || qi} className="card question">
              <legend>{qi + 1}. {q.question}</legend>
              <div className="options">
                {q.options.map((o, oi) => (
                  <label key={oi} className={`option ${answers[qi] === oi ? 'selected' : ''}`}>
                    <input type="radio" name={`q${qi}`} checked={answers[qi] === oi} onChange={() => choose(qi, oi)} />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button className="btn btn-block" disabled={busy}>{busy ? 'Submitting...' : 'Submit answers'}</button>
        </form>
      )}

      <h2>Past attempts</h2>
      {attempts.length === 0 ? (
        <p className="empty">No attempts yet.</p>
      ) : (
        <div className="table-wrap card">
          <table>
            <thead><tr><th>Date</th><th>Score</th><th>%</th><th>Result</th></tr></thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a._id}>
                  <td>{new Date(a.createdAt).toLocaleString()}</td>
                  <td>{a.score}/{a.total}</td>
                  <td>{a.percentage}%</td>
                  <td><span className={`badge ${a.passed ? 'badge-approved' : 'badge-blocked'}`}>{a.passed ? 'Passed' : 'Failed'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
