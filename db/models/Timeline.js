const mongoose = require('mongoose');

// Learning Schema - for lessons learned during each phase
const learningSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        category: {
            type: String,
            enum: ['tip', 'issue', 'decision', 'note'],
            default: 'note',
        },
    },
    { _id: false }
);

// Reference Schema - for images, links, and documents
const referenceSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: ['image', 'link', 'document'],
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            default: '',
        },
        data: {
            type: String,
            default: '', // Base64 data for images
        },
        description: {
            type: String,
            default: '',
        },
        uploadedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false }
);

// Image Schema - for subtask and phase images
const imageSchema = new mongoose.Schema(
    {
        id: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            default: '',
        },
        data: {
            type: String,
            default: '', // Base64 data
        },
        isMainImage: {
            type: Boolean,
            default: false,
        },
        showImage: {
            type: Boolean,
            default: false, // Backward compatibility
        },
        size: {
            type: Number,
            default: 0,
        },
    },
    { _id: false }
);

// Subtask Schema - for breaking down phases into smaller tasks
const subtaskSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        completed: {
            type: Boolean,
            default: false,
        },
        notes: {
            type: String,
            default: '',
        },
        learnings: {
            type: [learningSchema],
            default: [],
        },
        images: {
            type: [imageSchema],
            default: [],
        },
    },
    { _id: false }
);

// Phase Schema - main timeline phases
const phaseSchema = new mongoose.Schema(
    {
        id: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['Not Started', 'In Progress', 'Completed', 'Blocked'],
            default: 'Not Started',
        },
        startDate: {
            type: Date,
            default: null,
        },
        endDate: {
            type: Date,
            default: null,
        },
        order: {
            type: Number,
            required: true,
        },
        notes: {
            type: String,
            default: '',
        },
        learnings: {
            type: [learningSchema],
            default: [],
        },
        references: {
            type: [referenceSchema],
            default: [],
        },
        subtasks: {
            type: [subtaskSchema],
            default: [],
        },
        images: {
            type: [imageSchema],
            default: [],
        },
        // Optional: Link to related rooms
        relatedRooms: {
            type: [String],
            default: [],
        },
    },
    { _id: false }
);

// Timeline Schema
const timelineSchema = new mongoose.Schema(
    {
        phases: {
            type: [phaseSchema],
            default: [],
        },
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    }
);

// Virtual property to calculate overall progress
timelineSchema.virtual('overall_progress').get(function () {
    if (this.phases.length === 0) return 0;
    const completedPhases = this.phases.filter(
        (phase) => phase.status === 'Completed'
    ).length;
    return Math.round((completedPhases / this.phases.length) * 100);
});

// Virtual property to get current phase (first in-progress or not-started phase)
timelineSchema.virtual('current_phase').get(function () {
    const inProgress = this.phases.find((p) => p.status === 'In Progress');
    if (inProgress) return inProgress;

    const notStarted = this.phases.find((p) => p.status === 'Not Started');
    return notStarted || null;
});

// Ensure virtuals are included when converting to JSON/Object
timelineSchema.set('toJSON', { virtuals: true });
timelineSchema.set('toObject', { virtuals: true });

// Create model
const Timeline = mongoose.model('Timeline', timelineSchema, 'timeline');

module.exports = Timeline;
