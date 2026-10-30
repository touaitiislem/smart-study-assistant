import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context';
import Layout from './components/Layout';
import { Spinner } from './components/ui';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Quizzes from './pages/Quizzes';
import QuizPlayer from './pages/QuizPlayer';
import Tasks from './pages/Tasks';
import Assistant from './pages/Assistant';
import Settings from './pages/Settings';

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  return user ? <Layout /> : <Navigate to="/login" replace />;
}

function Guest({ mode }: { mode: 'login' | 'register' }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="grid min-h-screen place-items-center"><Spinner /></div>;
  return user ? <Navigate to="/dashboard" replace /> : <Auth mode={mode} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Guest mode="login" />} />
      <Route path="/register" element={<Guest mode="register" />} />
      <Route element={<Protected />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/courses/:id" element={<CourseDetail />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/quizzes" element={<Quizzes />} />
        <Route path="/quizzes/:id" element={<QuizPlayer />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
