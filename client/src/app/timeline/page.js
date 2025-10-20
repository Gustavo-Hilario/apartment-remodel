/**
 * Timeline Page
 *
 * Track apartment remodel progress through phases
 */

'use client';

import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { Button, LoadingSpinner } from '@/components/ui';
import TimelineView from '@/components/timeline/TimelineView';
import PhaseEditModal from '@/components/timeline/PhaseEditModal';
import AdminOnly from '@/components/auth/AdminOnly';
import './timeline.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function TimelinePage() {
  const [timeline, setTimeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);

  useEffect(() => {
    loadTimeline();
  }, []);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/timeline`);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setTimeline(data.timeline);
      } else {
        setError('Unable to load timeline data. Please try again.');
      }
    } catch (err) {
      console.error('Timeline fetch error:', err);
      // Set a default empty timeline instead of showing error for initial load
      setTimeline({ phases: [] });
      // Only show error if it's not a simple connection issue
      if (!err.message.includes('fetch')) {
        setError('Unable to connect to the server. Please check if the server is running.');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveTimeline = async (updatedTimeline) => {
    try {
      const response = await fetch(`${API_URL}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeline: updatedTimeline }),
      });

      const data = await response.json();
      if (data.success) {
        setTimeline(data.timeline);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving timeline:', err);
      return false;
    }
  };

  const handleAddPhase = () => {
    setEditingPhase(null);
    setShowEditModal(true);
  };

  const handleEditPhase = (phase) => {
    setEditingPhase(phase);
    setShowEditModal(true);
  };

  const handleDeletePhase = async (phaseId) => {
    if (!confirm('Are you sure you want to delete this phase?')) return;

    try {
      const response = await fetch(`${API_URL}/timeline/phase/${phaseId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setTimeline(data.timeline);
      }
    } catch (err) {
      console.error('Error deleting phase:', err);
    }
  };

  const handleSavePhase = async (phase) => {
    const updatedTimeline = { ...timeline };

    if (editingPhase) {
      // Update existing phase
      const phaseIndex = updatedTimeline.phases.findIndex(p => p.id === phase.id);
      if (phaseIndex >= 0) {
        updatedTimeline.phases[phaseIndex] = phase;
      }
    } else {
      // Add new phase
      phase.id = `phase-${Date.now()}`;
      phase.order = updatedTimeline.phases.length;
      updatedTimeline.phases.push(phase);
    }

    const success = await saveTimeline(updatedTimeline);
    if (success) {
      setShowEditModal(false);
      setEditingPhase(null);
    }
  };

  const getOverallProgress = () => {
    if (!timeline || timeline.phases.length === 0) return 0;
    const completedPhases = timeline.phases.filter(p => p.status === 'Completed').length;
    return Math.round((completedPhases / timeline.phases.length) * 100);
  };

  return (
    <MainLayout>
      <div className="timeline-page">
        <header className="timeline-header">
          <div className="timeline-header-content">
            <h1 className="timeline-title">Project Timeline</h1>
            <p className="timeline-subtitle">
              Track your apartment remodel progress through each phase
            </p>
          </div>
          <AdminOnly>
            <Button
              variant="primary"
              icon="+"
              onClick={handleAddPhase}
            >
              Add Phase
            </Button>
          </AdminOnly>
        </header>

        {!loading && timeline && timeline.phases.length > 0 && (
          <div className="timeline-progress-card">
            <div className="progress-info">
              <span className="progress-label">Overall Progress</span>
              <span className="progress-value">{getOverallProgress()}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${getOverallProgress()}%` }}
              />
            </div>
            <div className="progress-stats">
              <span>{timeline.phases.filter(p => p.status === 'Completed').length} of {timeline.phases.length} phases completed</span>
            </div>
          </div>
        )}

        {loading && (
          <div className="timeline-loading">
            <LoadingSpinner size="large" text="Loading timeline..." />
          </div>
        )}

        {error && (
          <div className="timeline-error">
            <h3>Error Loading Timeline</h3>
            <p>{error}</p>
            <Button onClick={loadTimeline}>Try Again</Button>
          </div>
        )}

        {!loading && !error && timeline && (
          <>
            {timeline.phases.length === 0 ? (
              <div className="timeline-empty">
                <div className="empty-icon">📅</div>
                <h3>No Phases Yet</h3>
                <p>Get started by adding your first remodel phase</p>
                <AdminOnly>
                  <Button variant="primary" icon="+" onClick={handleAddPhase}>
                    Add First Phase
                  </Button>
                </AdminOnly>
              </div>
            ) : (
              <TimelineView
                phases={timeline.phases}
                onEdit={handleEditPhase}
                onDelete={handleDeletePhase}
              />
            )}
          </>
        )}

        {showEditModal && (
          <PhaseEditModal
            phase={editingPhase}
            onSave={handleSavePhase}
            onClose={() => {
              setShowEditModal(false);
              setEditingPhase(null);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}
