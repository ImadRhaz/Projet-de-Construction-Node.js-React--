const mongoose = require('mongoose');

const taskResourceSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  quantity: { type: Number, required: true, default: 1 },
  dateUtilisation: { type: Date }
});

module.exports = mongoose.model('TaskResource', taskResourceSchema);