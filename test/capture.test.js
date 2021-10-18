import { expect } from 'chai'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

const url = process.env.KAPTURE_URL || 'http://localhost:3000'
const jwt = process.env.KAPTURE_JWT

const dataDir = './test/data'
const runDir = './test/run'

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

describe(`suite:${suite}`, () => {

  before(() => {
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recusrive: true })
    }
  })

  it('handle invalid json file', async () => {
    const body = {
      features: JSON.parse(fs.readFileSync(path.join(dataDir, 'invalid.geojson'))).features,
    }
    const res = await capture(body, 'invalid')
    expect(res.status).to.equal(422)
    const resMessage = await res.json()
    expect(resMessage.message === 'Invdalid \"features\" format')
    expect(resMessage.errors.length).to.equal(1)
  })

  it('capture default kano view', async () => {
    const body = {}
    const res = await capture(body, 'default')
    expect(res.status).to.equal(200)
  })

  it('capture multiple zoomed layers', async () => {
    const body = {
      layers: {
        'BASE_LAYERS': ['IMAGERY'],
        'CAPTURED_LAYERS': ['MAPILLARY'],
        'METEO_LAYERS': ['WIND_TILED']
      },
      bbox: [ 1.62, 43.11, 1.63, 43.12 ]
    }
    const res = await capture(body, 'layers')
    expect(res.status).to.equal(200)
  })

  it('capture geojson file', async () => {
    const body = {
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [3, 42.5] }, properties: { "fill-color": "#AAAAAA" } },
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [ [3, 42], [4, 43], [5,42], [6, 43]] }, properties: { "fill-color": "#AAAAAA" } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ [ [0, 42], [1, 42], [1, 43], [0, 43], [0, 42] ] ] }, properties: { "fill-color": "#AAAAAA" } }
      ]
    }
    const res = await capture(body, 'geojson')
    expect(res.status).to.equal(200)
  })

  it('capture gradient geoson file', async () => {
    const body = {
      layers: {
        'BASE_LAYERS': ['OSM_DARK']
      },
      features: JSON.parse(fs.readFileSync(path.join(dataDir, 'flight.geojson'))).features,
      size: { width: 800, height: 600 }
    }
    const res = await capture(body, 'gradient')
    expect(res.status).to.equal(200)
  })

  it('capture mask geoson file', async () => {
    const body = {
      layers: {
        'BASE_LAYERS': ['HYBRID']
      },
      features: [ JSON.parse(fs.readFileSync(path.join(dataDir, 'occitanie.geojson'))) ],
      size: { width: 1200, height: 900 }
    }
    const res = await capture(body, 'mask')
    expect(res.status).to.equal(200)
  })
})
