#!/usr/bin/env node
const cors = require('cors')
const express = require('express')
const capture = require('./capture')

const port = process.env.PORT || 3000
const url = process.env.URL  
const jwt = process.env.JWT

var app = express()
app.use(cors()) // enable cors

// Healthcheck
app.get('/healthcheck', (req, res) => {
  res.set('Content-Type', 'application/json')
  return res.status(200).json({ isRunning: true })
})

// Capture 
app.get('/capture', async (req, res) => {
  let start = new Date()
  let options = {
    width: req.query.width || 1024,
    height: req.query.height || 768,
    layers: req.query.layers,
    bbox: req.query.bbox
  }
  const buffer = await capture(url, jwt, options)
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

