#!/usr/bin/env node
const _ = require('lodash')
const cors = require('cors')
const express = require('express')
const capture = require('./capture')

const port = process.env.PORT || 3000
const url = process.env.KANO_URL  
const jwt = process.env.KANO_JWT

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
    url: process.env.KANO_URL,
    jwt: process.env.KANO_JWT,
    width: req.query.width || 1024,
    height: req.query.height || 768,
    baseLayer: _.get(req.query, 'base-layer') || 'OSM_BRIGHT',
    bbox: req.query.bbox ? _.split(req.query.bbox, ',') : null
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

