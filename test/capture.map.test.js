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
  // Make sure we have an activity set
  if (!parameters.activity) parameters.activity = 'map'
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
  return diffRatio < 5.0
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
    .timeout(15000)

  it('capture default map view', async () => {
    const body = {}
    const res = await capture(body, 'default-view')
    expect(res.status).to.equal(200)
    expect(match('default-view')).beTrue()
  })
    .timeout(15000)

  it('capture multiple zoomed layers', async function () {
    this.timeout(120000)
    const body = {
      layers: ['Layers.IMAGERY', 'Layers.ADMINEXPRESS'],
      bbox: [1.30, 45.51, 5.93, 47.88]
    }
    const res = await capture(body, 'map-layers')
    expect(res.status).to.equal(200)
    expect(match('map-layers')).beTrue()
  })
    .timeout(15000)

  it('handle invalid geojson crs', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'shapes-L93.geojson')))
    const res = await capture(body, 'map-shapes')
    expect(res.status).to.equal(422)
    const resMessage = await res.json()
    expect(resMessage.message === 'Invdalid "GeoJSON"')
    expect(resMessage.errors.length).to.equal(1)
    expect(resMessage.errors.message === 'Invalid CRS: urn:ogc:def:crs:epsg::2154')
  })
    .timeout(15000)

  it('capture heterogenous geojson file', async function () {
    this.timeout(120000)
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'shapes-WGS84.geojson')))
    const res = await capture(body, 'map-shapes')
    expect(res.status).to.equal(200)
    expect(match('map-shapes')).beTrue()
  })
    .timeout(15000)

  it('handle too large geojson file', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'adsb.geojson')))
    const res = await capture(body, 'adsb')
    expect(res.status).to.equal(413)
  })
    .timeout(15000)

  it('capture gradient geoson file', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'flight.geojson')))
    body.layers = ['Layers.OSM_DARK']
    body.size = { width: 800, height: 600 }
    const res = await capture(body, 'gradient-layer')
    expect(res.status).to.equal(200)
    expect(match('gradient-layer')).beTrue()
  })
    .timeout(15000)

  it('capture geojson with defined bbox', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'flight.geojson')))
    body.layers = ['Layers.OSM_DARK']
    body.size = { width: 800, height: 600 }
    body.bbox = [3.5, 51, 5.5, 53]
    const res = await capture(body, 'bounded-layer')
    expect(res.status).to.equal(200)
    expect(match('bounded-layer')).beTrue()
  })
    .timeout(15000)

  it('capture mask geoson file', async function () {
    this.timeout(120000)
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'occitanie.geojson')))
    body.layers = ['Layers.HYBRID']
    body.size = { width: 1200, height: 900 }
    const res = await capture(body, 'mask-layer')
    expect(res.status).to.equal(200)
    expect(match('mask-layer')).beTrue()
  })

  it('capture with default locale', async () => {
    const body = {}
    body.layout = JSON.parse(fs.readFileSync(path.join(dataDir, 'layout.json')))
    body.layers = ['Layers.OSM_BRIGHT', 'Layers.VIGICRUES']
    body.bbox = [0.2636, 46.32, 4.8834, 47.9844]
    body.size = { width: 2048, height: 1080 }
    const res = await capture(body, 'default-locale')
    expect(res.status).to.equal(200)
    expect(match('default-locale')).beTrue()
  })
    .timeout(15000)

  it('capture with french locale', async () => {
    const body = { lang: 'fr-FR' }
    body.layout = JSON.parse(fs.readFileSync(path.join(dataDir, 'layout.json')))
    body.layers = ['Layers.OSM_BRIGHT', 'Layers.VIGICRUES']
    body.bbox = [0.2636, 46.32, 4.8834, 47.9844]
    body.size = { width: 2048, height: 1080 }
    const res = await capture(body, 'french-locale')
    expect(res.status).to.equal(200)
    expect(match('french-locale')).beTrue()
  })
    .timeout(15000)

  // Cleanup
  after(async () => {
    if (server) await server.close()
  })
})
