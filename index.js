require('dotenv').config()
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const multer = require('multer')
const express = require('express')
const upload = multer({ dest: 'uploads' })
const app = express()
const File = require('./models/file')
const PORT = process.env.PORT || 3000
const MONGO_URI = process.env.MONGO_URI
mongoose.connect(MONGO_URI)
app.use(express.urlencoded({ extended: true }))
app.set('view engine', 'ejs')
app.get('/', (req, res) => {
  res.render('index')
})

app.post('/upload', upload.single('file'), async (req, res) => {
  const fileData = {
    path: req.file.path,
    originalName: req.file.originalname,
  }
  if (req.body.password != null && req.body.password != '') {
    fileData.password = await bcrypt.hash(req.body.password, 11)
  }
  const file = await File.create(fileData)

  res.render('index', { fileLink: `${req.headers.origin}/file/${file.id}` })
})

app.route('/file/:id').get(handleDownload).post(handleDownload)

async function handleDownload(req, res) {
  const file = await File.findById(req.params.id)
  if (!file) {
    return res.status(404).json({ message: 'file not found.' })
  }
  const matched = await bcrypt.compare(req.body.password || '', file.password)
  if (file.password != null && !matched) {
    res.render('auth')
    return
  }
  // if (!matched) {
  //   res.render('auth', { error: true })
  //   return
  // }
  file.downloadCount++
  await file.save()
  res.download(file.path, file.originalName)
}
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
