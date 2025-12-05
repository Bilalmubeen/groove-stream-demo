import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Handle malformed URLs with encoded query params in the path
    const pathname = location.pathname;
    
    // Check if URL has encoded ? or & in the path (e.g., /search%3Ftab=users)
    if (pathname.includes('%3F') || pathname.includes('%26')) {
      setIsRedirecting(true);
      const decoded = decodeURIComponent(pathname);
      const questionIndex = decoded.indexOf('?');
      
      if (questionIndex !== -1) {
        const basePath = decoded.substring(0, questionIndex);
        const queryString = decoded.substring(questionIndex + 1);
        navigate(`${basePath}?${queryString}`, { replace: true });
        return;
      }
    }
    
    console.error("404 Error: User attempted to access non-existent route:", pathname);
  }, [location.pathname, navigate]);

  if (isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <Link to="/" className="text-primary underline hover:text-primary/80">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
