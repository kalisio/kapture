import chai, { util, expect } from 'chai'
import chailint from 'chai-lint'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import pixelmatch from 'pixelmatch'
import png from 'pngjs'
import { createServer } from '../src/main.js'

const url = (process.env.KAPTURE_URL
  ? process.env.KAPTURE_URL
  : (process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3000'))
const jwt = process.env.KAPTURE_JWT

const dataDir = './test/data/capture'
const runDir = './test/run/capture'

const suite = 'capture'

async function capture (parameters, image) {
  // Setup the request url options
  const urlOptions = {
    method: 'POST',
    body: JSON.stringify(parameters),
    headers: {
      'Content-Type': 'application/json'
    }
  }
  // Add the Authorization header if jwt is defined
  if (jwt) urlOptions.headers.Authorization = 'Bearer ' + jwt
  // Perform the request
  const res = await fetch(`${url}/capture`, urlOptions)
  // Save the response as a PNG image
  if (res.status === 200) {
    const arrayBuffer = await res.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)
    fs.writeFileSync(path.join(runDir, image + '.png'), buffer)
  }
  return res
}

function match (image) {
  const runKey = path.join(runDir, image + '.png')
  const refKey = path.join('./test/data', suite, 'screenrefs', image + '.png')
  const runImg = png.PNG.sync.read(fs.readFileSync(runKey))
  const refImg = png.PNG.sync.read(fs.readFileSync(refKey))
  const { width, height } = runImg
  const diff = new png.PNG({ width, height })
  const options = {
    alpha: 0.3,
    diffColor: [255, 0, 0],
    diffColorAlt: [0, 255, 0],
    threshold: 0.1
  }
  const numDiffs = pixelmatch(runImg.data, refImg.data, diff.data, width, height, options)
  const diffRatio = 100.0 * (numDiffs / (width * height))
  return diffRatio < 1.0
}

describe(`suite:${suite}`, () => {
  let server

  before(() => {
    chailint(chai, util)
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true })
    }
  })

  it('initialize the kapture service', async () => {
    server = await createServer()
    expect(server).toExist()
  })
  // Let enough time to process
    .timeout(15000)

  it('handle invalid JSON body', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'invalid.geojson')))
    const res = await capture(body, 'invalid')
    expect(res.status).to.equal(422)
    const resMessage = await res.json()
    expect(resMessage.message === 'Invdalid "GeoJSON" format')
    expect(resMessage.errors.length).to.equal(2)
  })

  it('handle invalid width body', async () => {
    const body = {
      size: {
        width: 5000
      }
    }
    const res = await capture(body, 'invalid')
    expect(res.status).to.equal(404)
    const resMessage = await res.json()
    expect(resMessage.message === 'Invdalid "width" property')
  })

  it('capture default map view', async () => {
    const body = {}
    const res = await capture(body, 'map')
    expect(res.status).to.equal(200)
    expect(match('map')).beTrue()
  })

  it('capture zoomed globe view', async () => {
    const body = {
      activity: 'globe',
      bbox: [-30, 20, 30, 60],
      delay: 2000
    }
    const res = await capture(body, 'globe-zoom')
    expect(res.status).to.equal(200)
    expect(match('globe-zoom')).beTrue()
  })

  it('capture multiple zoomed layers', async () => {
    // Map view
    const body = {
      layers: ['Layers.IMAGERY', 'Layers.ADMINEXPRESS'],
      bbox: [-0.30, 45.51, 8.93, 47.88],
      delay: 2000
    }
    let res = await capture(body, 'map-layers')
    expect(res.status).to.equal(200)
    expect(match('map-layers')).beTrue()
    // Globe view
    body.activity = 'globe'
    res = await capture(body, 'globe-layers')
    expect(res.status).to.equal(200)
    expect(match('globe-layers')).beTrue()
  })

  it('handle invalid geojson crs', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'shapes-L93.geojson')))
    const res = await capture(body, 'map-shapes')
    expect(res.status).to.equal(422)
    const resMessage = await res.json()
    expect(resMessage.message === 'Invdalid "GeoJSON"')
    expect(resMessage.errors.length).to.equal(1)
    expect(resMessage.errors.message === 'Invalid CRS: urn:ogc:def:crs:epsg::2154')
  })

  it('capture heterogenous geojson file', async () => {
    // Map view
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'shapes-WGS84.geojson')))
    const res = await capture(body, 'map-shapes')
    expect(res.status).to.equal(200)
    expect(match('map-shapes')).beTrue()
    // Globe view
    // Cannot work for now
    /* body.activity = 'globe'
    body.delay = 2000
    res = await capture(body, 'globe-shapes')
    expect(res.status).to.equal(200)
    expect(match('globe-shapes')).beTrue() */
  })

  it('handle too large geojson file', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'adsb.geojson')))
    const res = await capture(body, 'adsb')
    expect(res.status).to.equal(413)
  })

  it('capture gradient geoson file', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'flight.geojson')))
    body.layers = ['Layers.OSM_DARK']
    body.size = { width: 800, height: 600 }
    const res = await capture(body, 'flight')
    expect(res.status).to.equal(200)
    expect(match('flight')).beTrue()
  })

  it('capture geojson with defined bbox', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'flight.geojson')))
    body.layers = ['Layers.OSM_DARK']
    body.size = { width: 800, height: 600 }
    body.bbox = [3.5, 51, 5.5, 53]
    const res = await capture(body, 'landing')
    expect(res.status).to.equal(200)
    expect(match('landing')).beTrue()
  })

  it('capture mask geoson file', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'occitanie.geojson')))
    body.layers = ['Layers.HYBRID']
    body.size = { width: 1200, height: 900 }
    const res = await capture(body, 'mask')
    expect(res.status).to.equal(200)
    expect(match('mask')).beTrue()
  })

  it('capture with layout', async () => {
    const body = {}
    body.layout = JSON.parse(fs.readFileSync(path.join(dataDir, 'layout.json')))
    body.layers = ['Layers.OSM_BRIGHT', 'Layers.TELERAY']
    body.bbox = [0.2636, 46.32, 4.8834, 47.9844]
    body.size = { width: 2048, height: 1080 }
    const res = await capture(body, 'layout')
    expect(res.status).to.equal(200)
    expect(match('layout')).beTrue()
  })

  // Cleanup
  after(async () => {
    if (server) await server.close()
  })
})
