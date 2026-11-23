import { Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound from './pages/NotFound.jsx';
import MyCourses from './pages/student/MyCourses.jsx';
import CoursePlayer from './pages/student/CoursePlayer.jsx';
import QuizPage from './pages/student/QuizPage.jsx';
import Dashboard from './pages/instructor/Dashboard.jsx';
import CourseForm from './pages/instructor/CourseForm.jsx';
import CourseBuilder from './pages/instructor/CourseBuilder.jsx';
import QuizBuilder from './pages/instructor/QuizBuilder.jsx';
import AdminCourses from './pages/admin/AdminCourses.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';

const guard = (roles, el) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/my-courses" element={guard(['student'], <MyCourses />)} />
          <Route path="/learn/:courseId" element={guard(['student', 'instructor', 'admin'], <CoursePlayer />)} />
          <Route path="/quiz/:quizId" element={guard(['student'], <QuizPage />)} />

          <Route path="/instructor" element={guard(['instructor'], <Dashboard />)} />
          <Route path="/instructor/courses/new" element={guard(['instructor'], <CourseForm />)} />
          <Route path="/instructor/courses/:id/edit" element={guard(['instructor'], <CourseForm />)} />
          <Route path="/instructor/courses/:id" element={guard(['instructor'], <CourseBuilder />)} />
          <Route path="/instructor/courses/:courseId/quiz/new" element={guard(['instructor'], <QuizBuilder />)} />
          <Route path="/instructor/quiz/:quizId" element={guard(['instructor'], <QuizBuilder />)} />

          <Route path="/admin" element={guard(['admin'], <AdminCourses />)} />
          <Route path="/admin/users" element={guard(['admin'], <AdminUsers />)} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="footer">
        <div className="container">LearnHub · MERN Learning Management System</div>
      </footer>
    </>
  );
}
