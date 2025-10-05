/**
 * Loading Spinner Component
 * 
 * Shows loading state
 */

import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 'medium', text = '' }) {
  return (
    <div className="loading-spinner-container">
      <div className={`loading-spinner loading-spinner-${size}`}>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
}
