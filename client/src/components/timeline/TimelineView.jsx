/**
 * Timeline View Component
 *
 * Custom vertical timeline without external dependencies
 */

'use client';

import PhaseCard from './PhaseCard';
import './TimelineView.css';

export default function TimelineView({ phases, onEdit, onDelete }) {
  const sortedPhases = [...phases].sort((a, b) => a.order - b.order);

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed':
        return '#11998e';
      case 'In Progress':
        return '#667eea';
      case 'Blocked':
        return '#ee0979';
      default:
        return '#999';
    }
  };

  // Format date for display
  function formatDate(dateStr, index) {
    if (!dateStr) return `Phase ${index + 1}`;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="custom-timeline">
      {sortedPhases.map((phase, index) => (
        <div key={phase.id} className="timeline-item">
          <div className="timeline-marker">
            <div
              className="timeline-dot"
              style={{ backgroundColor: getStatusColor(phase.status) }}
            />
            {index < sortedPhases.length - 1 && (
              <div className="timeline-line" />
            )}
          </div>
          <div className="timeline-content">
            <div className="timeline-date">
              {formatDate(phase.startDate, index)}
            </div>
            <PhaseCard
              phase={phase}
              onEdit={() => onEdit(phase)}
              onDelete={() => onDelete(phase.id)}
              statusColor={getStatusColor(phase.status)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
