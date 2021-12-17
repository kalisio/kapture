#!/usr/bin/env node
import _ from 'lodash'
import cors from 'cors'
import express from 'express'
import { Buffer } from 'buffer'
import { capture } from './capture.js'
import geojsonhint from '@mapbox/geojsonhint'

const port = process.env.PORT || 3000
const bodyLimit = process.env.BODY_LIMIT || '100kb'
const kanoUrl = process.env.KANO_URL
const kanoJwt = process.env.KANO_JWT

// activity validator middleware
const activityValidator = function (req, res, next) {
  const activity = _.get(req.body, 'activity')
  if (activity) {
    if (!_.includes(['map', 'globe'], activity)) res.status(404).json({ message: 'Invdalid \"activity\" property' })
    else next()
  } else {
    next()
  }
}

// layers validator middleware
const layersValidator = function (req, res, next) {
  const layers = _.get(req.body, 'layers') 
  if (layers) {
    if (!_.isArray(layers)) res.status(404).json({ message: 'Invdalid \"layers\" property' })
    else next()
  } else {
    next()
  }
}

// size validator
const sizeValidator = function (req, res, next) {
  const width = _.get(req.body, 'size.width')
  const height = _.get(req.body, 'size.height')
  if (width || height) {
    if (width < 256 || width > 4000 || height < 256 || height > 4000) res.status(404).json({ message: 'Invdalid \"size\" property' })
    else next()
  } else {
    next()
  }
}

// features validator middleware
const geoJsonValidator = function (req, res, next) {
  if (req.body.type === 'FeatureCollection' || req.body.type === 'Feature') {
    // lint the geojson file
    const messages = geojsonhint.hint(req.body)
    // filter the messages to find the errors
    const errors = _.filter(messages, message => { return _.get(message, 'level') !== 'message' })
    if (errors.length > 0) res.status(422).json({ message: 'Invdalid \"GeoJSON\" format', errors })
    else next()
  } else {
    next()
  }
}

// Initialize express app
const app = express()
app.use(cors()) // enable cors
app.use(express.urlencoded({limit: bodyLimit, extended: true}))
app.use(express.json({limit: bodyLimit}))
app.use(activityValidator)
app.use(layersValidator)
app.use(sizeValidator)
app.use(geoJsonValidator)

// Capture 
app.post('/capture', async (req, res) => {
  let start = new Date()
  const buffer = await capture(Object.assign(req.body, { url : kanoUrl, jwt: kanoJwt }))
  if (Buffer.isBuffer(buffer)) {
    res.contentType('image/png')
    res.send(buffer)
    let duration = new Date() - start
    console.log('<> capture processed in %dms', duration)
  } else {
    res.status(500).json({ message: 'Internal service error' })
  }
})

// Healthcheck
app.get('/healthcheck', (req, res) => {
  res.set('Content-Type', 'application/json')
  return res.status(200).json({ isRunning: true })
})

// Serve the app
app.listen(port, () => {
  console.log('<> kapture server listening at %d (body limit %s)', port, bodyLimit)
})

