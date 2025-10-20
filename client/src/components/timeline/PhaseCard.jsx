/**
 * Phase Card Component
 *
 * Displays phase information with subtasks, learnings, and references
 */

'use client';

import Button from '../ui/Button';
import AdminOnly from '../auth/AdminOnly';
import './PhaseCard.css';

export default function PhaseCard({ phase, onEdit, onDelete, statusColor }) {
  const completedSubtasks = phase.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = phase.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return '✓';
      case 'In Progress':
        return '⚡';
      case 'Blocked':
        return '🚫';
      default:
        return '○';
    }
  };

  return (
    <div className={`phase-card ${phase.status === 'Completed' ? 'completed' : ''}`}>
      <div className="phase-card-header">
        <div className="phase-info">
          <h3 className="phase-title">{phase.title}</h3>
          <span
            className="phase-status"
            style={{
              background: `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%)`
            }}
          >
            {getStatusIcon(phase.status)} {phase.status}
          </span>
        </div>
      </div>

      {phase.description && (
        <p className="phase-description">{phase.description}</p>
      )}

      <div className="phase-dates">
        <div className="date-item">
          <span className="date-label">Start:</span>
          <span className="date-value">{formatDate(phase.startDate)}</span>
        </div>
        {phase.endDate && (
          <div className="date-item">
            <span className="date-label">End:</span>
            <span className="date-value">{formatDate(phase.endDate)}</span>
          </div>
        )}
      </div>

      {totalSubtasks > 0 && (
        <div className="phase-subtasks">
          <div className="subtasks-header">
            <span className="subtasks-label">Subtasks</span>
            <span className="subtasks-count">{completedSubtasks}/{totalSubtasks}</span>
          </div>
          <div className="subtasks-progress-bar">
            <div
              className="subtasks-progress-fill"
              style={{ width: `${subtaskProgress}%`, background: statusColor }}
            />
          </div>
        </div>
      )}

      <div className="phase-meta">
        {phase.learnings && phase.learnings.length > 0 && (
          <span className="meta-item">📚 {phase.learnings.length} Learnings</span>
        )}
        {phase.references && phase.references.length > 0 && (
          <span className="meta-item">🔗 {phase.references.length} References</span>
        )}
        {phase.notes && (
          <span className="meta-item">📝 Has Notes</span>
        )}
      </div>

      <AdminOnly>
        <div className="phase-actions">
          <Button
            variant="secondary"
            size="small"
            icon="✏️"
            onClick={onEdit}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="small"
            icon="🗑️"
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </AdminOnly>
    </div>
  );
}
