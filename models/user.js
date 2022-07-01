const mongoose = require('mongoose')

const User = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    files: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'File',
    },
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.Model('User', User)
