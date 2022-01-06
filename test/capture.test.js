import { expect } from 'chai'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import pixelmatch from 'pixelmatch'
import png from 'pngjs'

const url = process.env.KAPTURE_URL || 'http://localhost:3000'
const jwt = process.env.KAPTURE_JWT

const dataDir = './test/data/capture'
const runDir = './test/run/capture'

const suite = 'capture'

async function capture(parameters, image) {
  // Setup the request url options
  let urlOptions = {
    method: 'POST',
    body: JSON.stringify(parameters),
    headers: { 
      'Content-Type': 'application/json'
    }
  }
  // Add the Authorization header if jwt is defined
  if (jwt) urlOptions.headers['Authorization'] = 'Bearer ' + jwt
  // Perform the request
  const res = await fetch(url + '/capture', urlOptions)
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
  const refKey = path.join('./test/data', suite , 'screenrefs', image + '.png')
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

  before(() => {
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recusrive: true })
    }
  })

  it('handle invalid JSON body', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'invalid.geojson')))
    const res = await capture(body, 'invalid')
    expect(res.status).to.equal(422)
    const resMessage = await res.json()
    expect(resMessage.message === 'Invdalid \"GeoJSON\" format')
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
    expect(resMessage.message === 'Invdalid \"width\" property')
  })

  it('capture default map view', async () => {
    const body = {}
    const res = await capture(body, 'map')
    expect(res.status).to.equal(200)
    expect(match('map')).to.be.true
  })

  it('capture zoomed globe view', async () => {
    const body = {
      activity: 'globe',
      bbox: [ -30, 20, 30, 60 ]
    }
    const res = await capture(body, 'globe')
    expect(res.status).to.equal(200)
    expect(match('globe')).to.be.true
  })

  it('capture multiple zoomed layers', async () => {
    // Map view
    let body = {
      layers: ['imagery', 'Layers.ADMINEXPRESS'],
      bbox: [ 1.6, 43.10, 1.65, 43.14 ]
    }
    let res = await capture(body, 'map-layers')
    expect(res.status).to.equal(200)
    expect(match('map-layers')).to.be.true
    // Globe view
    body.activity = 'globe'
    res = await capture(body, 'globe-layers')
    expect(res.status).to.equal(200)
  })

  it('capture heterogenous geojson file', async () => {
    // Map view
    let body = JSON.parse(fs.readFileSync(path.join(dataDir, 'shapes.geojson')))
    let  res = await capture(body, 'map-shapes')
    expect(res.status).to.equal(200)
    expect(match('map-shapes')).to.be.true
    // Globe view
    body.activity = 'globe'
    res = await capture(body, 'globe-shapes')
    expect(res.status).to.equal(200)
    expect(match('globe-shapes')).to.be.true
  })

  it('handle too large geojson file', async () => {
    const body = JSON.parse(fs.readFileSync(path.join(dataDir, 'adsb.geojson')))
    const res = await capture(body, 'adsb')
    expect(res.status).to.equal(413)
  })

  it('capture gradient geoson file', async () => {
    let body = JSON.parse(fs.readFileSync(path.join(dataDir, 'flight.geojson')))
    body.layers = ['Layers.OSM_DARK']
    body.size = { width: 800, height: 600 }
    const res = await capture(body, 'flight')
    expect(res.status).to.equal(200)
    expect(match('flight')).to.be.true
  })

  it('capture geojson with defined bbox', async () => {
    let body = JSON.parse(fs.readFileSync(path.join(dataDir, 'flight.geojson')))
    body.layers = ['Layers.OSM_DARK']
    body.size = { width: 800, height: 600 }
    body.bbox = [ 3.5, 51, 5.5, 53 ]
    const res = await capture(body, 'landing')
    expect(res.status).to.equal(200)
    expect(match('landing')).to.be.true
  })

  it('capture mask geoson file', async () => {
    let body = JSON.parse(fs.readFileSync(path.join(dataDir, 'occitanie.geojson')))
    body.layers = ['Layers.HYBRID']
    body.size = { width: 1200, height: 900 }
    const res = await capture(body, 'mask')
    expect(res.status).to.equal(200)
    expect(match('mask')).to.be.true
  })
})
