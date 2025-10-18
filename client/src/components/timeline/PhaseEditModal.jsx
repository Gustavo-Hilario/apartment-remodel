/**
 * Phase Edit Modal Component
 *
 * Form for creating and editing timeline phases
 */

'use client';

import { useState } from 'react';
import Button from '../ui/Button';
import './PhaseEditModal.css';

export default function PhaseEditModal({ phase, onSave, onClose }) {
  const [formData, setFormData] = useState({
    id: phase?.id || '',
    title: phase?.title || '',
    description: phase?.description || '',
    status: phase?.status || 'Not Started',
    startDate: phase?.startDate ? new Date(phase.startDate).toISOString().split('T')[0] : '',
    endDate: phase?.endDate ? new Date(phase.endDate).toISOString().split('T')[0] : '',
    order: phase?.order || 0,
    notes: phase?.notes || '',
    subtasks: phase?.subtasks || [],
    learnings: phase?.learnings || [],
    references: phase?.references || [],
    relatedRooms: phase?.relatedRooms || [],
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [newSubtask, setNewSubtask] = useState('');
  const [newLearning, setNewLearning] = useState({ content: '', category: 'note' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Please enter a phase title');
      return;
    }
    onSave(formData);
  };

  // Subtasks
  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    const subtask = {
      id: `subtask-${Date.now()}`,
      title: newSubtask,
      completed: false,
      notes: '',
    };
    setFormData(prev => ({
      ...prev,
      subtasks: [...prev.subtasks, subtask]
    }));
    setNewSubtask('');
  };

  const handleToggleSubtask = (subtaskId) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.map(st =>
        st.id === subtaskId ? { ...st, completed: !st.completed } : st
      )
    }));
  };

  const handleDeleteSubtask = (subtaskId) => {
    setFormData(prev => ({
      ...prev,
      subtasks: prev.subtasks.filter(st => st.id !== subtaskId)
    }));
  };

  // Learnings
  const handleAddLearning = () => {
    if (!newLearning.content.trim()) return;
    const learning = {
      id: `learning-${Date.now()}`,
      content: newLearning.content,
      category: newLearning.category,
      date: new Date().toISOString(),
    };
    setFormData(prev => ({
      ...prev,
      learnings: [...prev.learnings, learning]
    }));
    setNewLearning({ content: '', category: 'note' });
  };

  const handleDeleteLearning = (learningId) => {
    setFormData(prev => ({
      ...prev,
      learnings: prev.learnings.filter(l => l.id !== learningId)
    }));
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'tip': return '💡';
      case 'issue': return '⚠️';
      case 'decision': return '✅';
      default: return '📝';
    }
  };

  return (
    <div className="phase-modal-overlay" onClick={onClose}>
      <div className="phase-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{phase ? 'Edit Phase' : 'Add New Phase'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab ${activeTab === 'basic' ? 'active' : ''}`}
            onClick={() => setActiveTab('basic')}
          >
            Basic Info
          </button>
          <button
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            {activeTab === 'basic' && (
              <div className="tab-content">
                <div className="form-group">
                  <label>Phase Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Demolition, Electrical Work"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Brief description of this phase"
                    rows={3}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={formData.status} onChange={handleChange}>
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="Additional notes, observations, or details"
                    rows={4}
                  />
                </div>
              </div>
            )}

            {activeTab === 'details' && (
              <div className="tab-content">
                {/* Subtasks */}
                <div className="form-section">
                  <h3>Subtasks</h3>
                  <div className="add-item-row">
                    <input
                      type="text"
                      value={newSubtask}
                      onChange={(e) => setNewSubtask(e.target.value)}
                      placeholder="Add a subtask..."
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubtask();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={handleAddSubtask}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="items-list">
                    {formData.subtasks.map(subtask => (
                      <div key={subtask.id} className="item-row">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={subtask.completed}
                            onChange={() => handleToggleSubtask(subtask.id)}
                          />
                          <span className={subtask.completed ? 'completed' : ''}>
                            {subtask.title}
                          </span>
                        </label>
                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => handleDeleteSubtask(subtask.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Learnings */}
                <div className="form-section">
                  <h3>Learnings & Notes</h3>
                  <div className="add-learning-row">
                    <select
                      value={newLearning.category}
                      onChange={(e) => setNewLearning(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="note">Note</option>
                      <option value="tip">Tip</option>
                      <option value="issue">Issue</option>
                      <option value="decision">Decision</option>
                    </select>
                    <textarea
                      value={newLearning.content}
                      onChange={(e) => setNewLearning(prev => ({ ...prev, content: e.target.value }))}
                      placeholder="Add a learning or note..."
                      rows={2}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={handleAddLearning}
                    >
                      Add
                    </Button>
                  </div>

                  <div className="learnings-list">
                    {formData.learnings.map(learning => (
                      <div key={learning.id} className="learning-item">
                        <div className="learning-header">
                          <span className="learning-icon">{getCategoryIcon(learning.category)}</span>
                          <span className="learning-category">{learning.category}</span>
                          <button
                            type="button"
                            className="delete-btn"
                            onClick={() => handleDeleteLearning(learning.id)}
                          >
                            ✕
                          </button>
                        </div>
                        <p className="learning-content">{learning.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {phase ? 'Save Changes' : 'Add Phase'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
