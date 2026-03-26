import { HomeIcon, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="error-page">
      <div className="error-container">
        {/* Animated number */}
        <div className="error-number">
          <h1>404</h1>
          <div className="pulse-circle" />
        </div>
        
        {/* Error message */}
        <div className="error-message">
          <h2>Page Not Found</h2>
          <p>
            Oops! The page you're looking for seems to have wandered off into the digital wilderness.
          </p>
        </div>
        
        {/* Action buttons */}
        <div className="button-container">
          <button 
            onClick={() => window.history.back()} 
            className="button button-secondary"
          >
            <ArrowLeft />
            Go Back
          </button>
          
          <button 
            onClick={() => window.location.href = '/'} 
            className="button button-primary"
          >
            <HomeIcon />
            Return Home
          </button>
        </div>

        <style>{`
          .error-page {
            min-height: 100vh;
            background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            font-family: system-ui, -apple-system, sans-serif;
          }

          .error-container {
            text-align: center;
            max-width: 32rem;
          }

          .error-number {
            position: relative;
            margin-bottom: 2rem;
          }

          .error-number h1 {
            font-size: 9rem;
            font-weight: bold;
            color: #e5e7eb;
            margin: 0;
            animation: pulse 2s infinite;
          }

          .pulse-circle {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .pulse-circle::after {
            content: '';
            width: 6rem;
            height: 6rem;
            background-color: #3b82f6;
            border-radius: 50%;
            opacity: 0.1;
            animation: ping 2s infinite;
          }

          .error-message {
            margin-bottom: 2rem;
          }

          .error-message h2 {
            font-size: 1.875rem;
            font-weight: bold;
            color: #1f2937;
            margin: 0 0 0.5rem 0;
          }

          .error-message p {
            color: #4b5563;
            margin: 0;
            line-height: 1.5;
          }

          .button-container {
            display: flex;
            gap: 1rem;
            justify-content: center;
            padding-top: 1rem;
            flex-direction: column;
          }

          @media (min-width: 640px) {
            .button-container {
              flex-direction: row;
            }
          }

          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }

          .button svg {
            width: 1rem;
            height: 1rem;
          }

          .button-primary {
            background-color: #3b82f6;
            color: white;
          }

          .button-primary:hover {
            background-color: #2563eb;
          }

          .button-secondary {
            background-color: white;
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .button-secondary:hover {
            background-color: #f9fafb;
          }

          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.8;
            }
          }

          @keyframes ping {
            0% {
              transform: scale(1);
              opacity: 0.1;
            }
            75%, 100% {
              transform: scale(2);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default NotFound;