#!/usr/bin/env node
import _ from 'lodash'
import cors from 'cors'
import express from 'express'
import { Buffer } from 'buffer'
import { capture } from './capture.js'
import geojsonhint from '@mapbox/geojsonhint'

const port = process.env.PORT || 3000
const url = process.env.KANO_URL || 'kano'
const jwt = process.env.KANO_JWT

// features validator middleware
const featuresValidator = function (req, res, next) {
  if (req.body.features) {
    const collection = {
      type: 'FeatureCollection',
      features: req.body.features
    }
    // lint the geojson file
    const messages = geojsonhint.hint(collection)
    // filter the messages to find the errors
    const errors = _.filter(messages, message => { return _.get(message, 'level') !== 'message' })
    if (errors.length > 0) res.status(422).json({ message: 'Invdalid \"features\" format', errors })
    else next()
  } else {
    next()
  }
}

// Initialize express app
const app = express()
app.use(cors()) // enable cors
app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(featuresValidator)

// Capture 
app.post('/capture', async (req, res) => {
  let start = new Date()
  const buffer = await capture(Object.assign(req.body, { url, jwt }))
  if (Buffer.isBuffer(buffer)) {
    res.contentType('image/png')
    res.send(buffer)
    let duration = new Date() - start
    console.log('capture processed in %dms', duration)
  } else {
    res.status(404).json({ message: 'Bad request' })
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

