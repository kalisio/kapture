#!/usr/bin/env node
const _ = require('lodash')
const cors = require('cors')
const express = require('express')
const capture = require('./capture')

const port = process.env.PORT || 3000
const url = process.env.KANO_URL || 'kano'
const jwt = process.env.KANO_JWT

// Initialize express app
const app = express()
app.use(cors()) // enable cors
app.use(express.urlencoded({extended: true}))
app.use(express.json())




// Capture 
app.post('/capture', async (req, res) => {
  let start = new Date()
  const buffer = await capture(Object.assign(req.body, { url, jwt }))
  if (buffer) {
    res.contentType('image/png')
    res.send(buffer)
    let duration = new Date() - start
    console.log('capture processed in %dms', duration)
  } else {
    res.status(404).json({ message: 'Bad Request' });
  }
})

// Healthcheck
app.get('/healthcheck', (req, res) => {
  res.set('Content-Type', 'application/json')
  return res.status(200).json({ isRunning: true })
})

// Serve the app
app.listen(port, () => {
  console.log('kapture server listening at %d', port)
})

