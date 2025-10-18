/**
 * Timeline View Component
 *
 * Displays phases using react-chrono with custom card content
 */

'use client';

import { Chrono } from 'react-chrono';
import PhaseCard from './PhaseCard';
import './TimelineView.css';

export default function TimelineView({ phases, onEdit, onDelete }) {
  // Transform phases for react-chrono
  const chronoItems = phases
    .sort((a, b) => a.order - b.order)
    .map(phase => ({
      title: formatDate(phase.startDate),
      cardTitle: phase.title,
      cardSubtitle: phase.description || '',
      cardDetailedText: '', // Will use custom content
    }));

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
  function formatDate(dateStr) {
    if (!dateStr) return 'No date set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="timeline-view">
      <Chrono
        items={chronoItems}
        mode="VERTICAL"
        theme={{
          primary: '#667eea',
          secondary: '#f5f5f5',
          cardBgColor: '#ffffff',
          titleColor: '#333',
          titleColorActive: '#667eea',
        }}
        cardHeight={200}
        scrollable={false}
        hideControls
        disableClickOnCircle
        disableNavOnKey
      >
        {phases
          .sort((a, b) => a.order - b.order)
          .map((phase, index) => (
            <div key={phase.id} className="timeline-card-content">
              <PhaseCard
                phase={phase}
                onEdit={() => onEdit(phase)}
                onDelete={() => onDelete(phase.id)}
                statusColor={getStatusColor(phase.status)}
              />
            </div>
          ))}
      </Chrono>
    </div>
  );
}
