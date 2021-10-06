#!/usr/bin/env node
const _ = require('lodash')
const cors = require('cors')
const express = require('express')
const capture = require('./capture')

const port = process.env.PORT || 3000
const url = process.env.KANO_URL || 'kano'
const jwt = process.env.KANO_JWT

var app = express()
app.use(cors()) // enable cors
app.use(express.urlencoded({extended: true})); 
app.use(express.json());

// Healthcheck
app.get('/healthcheck', (req, res) => {
  res.set('Content-Type', 'application/json')
  return res.status(200).json({ isRunning: true })
})

// Capture 
app.post('/capture', async (req, res) => {
  console.log(req.body)
  let start = new Date()
  let options = {
    url: url,
    jwt: jwt,
    width: _.get(req.body, 'size.width', 1024),
    height: _.get(req.body, 'size.height', 768),
    bbox: _.get(req.body, 'bbox'),
    layers: _.get(req.body, 'layers'),
    features: _.get(req.body, 'features')
  }
  const buffer = await capture(options)
  if (buffer) {
    res.contentType('image/png')
    res.send(buffer)
    let duration = new Date() - start
    console.log('capture processed in %dms', duration)
  } else {
    res.status(404).json({ message: 'Bad Request' });
  }
})

app.listen(port, () => {
  console.log('kapture server listening at %d', port)
})

