import { useEffect, useState } from 'react';
import { api } from '../api/api.js';
import CourseCard from '../components/CourseCard.jsx';
import Loader, { ErrorBox } from '../components/Loader.jsx';

export default function Home() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [data, setData] = useState({ courses: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (query) params.set('search', query);
    if (category) params.set('category', category);
    api
      .get(`/courses?${params}`)
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  };

  useEffect(load, [query, category]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  return (
    <>
      <section className="hero">
        <h1>Learn something new today</h1>
        <p>Courses by expert instructors, with progress tracking and auto-graded quizzes.</p>
        <form className="search" onSubmit={submit} role="search">
          <input
            type="search"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search courses"
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {data.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button className="btn" type="submit">Search</button>
        </form>
      </section>

      <ErrorBox error={error} onRetry={load} />
      {loading ? (
        <Loader text="Loading courses..." />
      ) : data.courses.length === 0 ? (
        <div className="empty">
          <p>No courses found{query ? ` for "${query}"` : ''}.</p>
          {(query || category) && (
            <button className="btn btn-ghost" onClick={() => { setSearch(''); setQuery(''); setCategory(''); }}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid">
          {data.courses.map((c) => (
            <CourseCard key={c._id} course={c} />
          ))}
        </div>
      )}
    </>
  );
}
