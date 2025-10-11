import { Navigate } from 'react-router-dom';

export default function Upload() {
  // Redirect to profile page where upload functionality is integrated
  return <Navigate to="/profile" replace />;
}
