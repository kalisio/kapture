#!/usr/bin/env node
import _ from 'lodash'
import cors from 'cors'
import express from 'express'
import { Buffer } from 'buffer'
import { capture } from './capture.js'
import geojsonhint from '@mapbox/geojsonhint'

const port = process.env.PORT || 3000
const kanoUrl = process.env.KANO_URL
const kanoJwt = process.env.KANO_JWT
const bodyLimit = process.env.BODY_LIMIT || '100kb'

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
app.use(geoJsonValidator)

// Capture 
app.post('/capture', async (req, res) => {
  let start = new Date()
  const buffer = await capture(Object.assign(req.body, { url : kanoUrl, jwt: kanoJwt }))
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

