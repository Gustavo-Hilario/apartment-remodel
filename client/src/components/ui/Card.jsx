/**
 * Card Component
 * 
 * Container for content sections
 */

import './Card.css';

export default function Card({ 
  children, 
  title,
  subtitle,
  headerAction,
  className = '',
  hoverable = false,
  onClick,
  ...props 
}) {
  const cardClass = [
    'card',
    hoverable && 'card-hoverable',
    onClick && 'card-clickable',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass} onClick={onClick} {...props}>
      {(title || headerAction) && (
        <div className="card-header">
          <div className="card-header-content">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {headerAction && (
            <div className="card-header-action">
              {headerAction}
            </div>
          )}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}
