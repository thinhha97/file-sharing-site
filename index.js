require('dotenv').config()
const aws = require('aws-sdk')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')
const https = require('https')
const multer = require('multer')
const multerS3 = require('multer-s3')
const express = require('express')
const File = require('./models/file')
const PORT = process.env.PORT || 3000
const MONGO_URI = process.env.MONGO_URI
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME
mongoose.connect(MONGO_URI, {
  keepAlive: true,
})

aws.config.update({
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  accessKeyId: AWS_ACCESS_KEY_ID,
  region: 'us-west-2',
  signatureVersion: 'v4',
})

const app = express()
const s3 = new aws.S3()
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
const upload = multer({
  storage: multerS3({
    s3: s3,
    acl: 'public-read',
    bucket: AWS_BUCKET_NAME,
    key: function (req, file, cb) {
      console.log(file)
      cb(null, file.originalname)
    },
  }),
})

app.set('view engine', 'ejs')
app.get('/', (req, res) => {
  res.render('index')
})

app.post('/upload', upload.single('file'), async (req, res) => {
  const fileData = {
    path: req.file.location,
    originalName: req.file.originalname,
  }
  console.log(fileData)
  if (req.body.password != null && req.body.password != '') {
    fileData.password = await bcrypt.hash(req.body.password, 11)
  }
  const file = await File.create(fileData)

  res.render('index', { fileLink: `${req.headers.origin}/file/${file.id}` })
})

app.route('/file/:id').get(handleDownload).post(handleDownload)
app.route('/file-info/:id')

async function handleDownload(req, res) {
  const file = await File.findById(req.params.id)
  if (!file) {
    return res.status(404).json({ message: 'file not found.' })
  }
  if (file.password != null) {
    const matched = await bcrypt.compare(req.body.password || '', file.password)
    if (!matched) {
      res.render('auth')
      return
    }
  }
  // if (!matched) {
  //   res.render('auth', { error: true })
  //   return
  // }
  file.downloadCount++
  await file.save()

  res.header('Content-Disposition', `attachment; filename="${file.originalName}"`);
  https.get(file.path, function(file) {
    file.pipe(res)
  })

}
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
