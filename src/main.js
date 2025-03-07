import _ from 'lodash'
import cors from 'cors'
import express from 'express'
import { Buffer } from 'buffer'
import { capture } from './capture.js'
import { validateGeoJson } from './utils.geojson.js'

const port = process.env.PORT || 3000
const bodyLimit = process.env.BODY_LIMIT || '100kb'
const delay = process.env.DELAY || 2000
const networkdIdleTimeout = process.env.NETWORK_IDLE_TIMEOUT || 100000
const appUrl = process.env.APP_URL
const appJwt = process.env.APP_JWT
const appName = process.env.APP_NAME

// activity validator middleware
const activityValidator = function (req, res, next) {
  const activity = _.get(req.body, 'activity')
  if (activity) {
    if (!_.includes(['map', 'globe'], activity)) res.status(404).json({ message: 'Invdalid "activity" property' })
    else next()
  } else {
    next()
  }
}

// layers validator middleware
const layersValidator = function (req, res, next) {
  const layers = _.get(req.body, 'layers')
  if (layers) {
    if (!_.isArray(layers)) res.status(404).json({ message: 'Invdalid "layers" property' })
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
    if (width < 256 || width > 4000 || height < 256 || height > 4000) res.status(404).json({ message: 'Invdalid "size" property' })
    else next()
  } else {
    next()
  }
}

// features validator middleware
const geoJsonValidator = function (req, res, next) {
  if (req.body.type === 'FeatureCollection' || req.body.type === 'Feature') {
    const errors = validateGeoJson(req.body)
    if (errors.length > 0) res.status(422).json({ message: 'Invdalid "GeoJSON"', errors })
    else next()
  } else {
    next()
  }
}

export async function createServer () {
  // Initialize express app
  const app = express()
  app.use(cors()) // enable cors
  app.use(express.urlencoded({ limit: bodyLimit, extended: true }))
  app.use(express.json({ limit: bodyLimit }))

  // Capture
  app.post('/capture', [activityValidator, layersValidator, sizeValidator, geoJsonValidator], async (req, res) => {
    const start = new Date()
    const buffer = await capture(_.defaults(req.body, { url: appUrl, jwt: appJwt, delay, networkdIdleTimeout, appName }))
    if (Buffer.isBuffer(Buffer.from(buffer))) {
      res.contentType('image/png')
      res.send(Buffer.from(buffer))
      const duration = new Date() - start
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
  const server = await app.listen(port)
  console.log('[KAPTURE] server listening at %d (body limit %s, delay %s, network idle timeout %s)', port, bodyLimit, delay, networkdIdleTimeout)
  return server
}
