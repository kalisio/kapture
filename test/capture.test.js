import { expect } from 'chai'
import fetch from 'node-fetch'

const url = 'http://localhost:3000'

const suite = 'capture'

async function capture(body) {
  const res = await fetch(url + '/capture', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 
      'Content-Type': 'application/json'
    }
  })
  return res
}

describe(`suite:${suite}`, () => {

  it('capture default kano view', async () => {
    const body = {}
    const res = await capture(body)
    expect(res.status).to.equal(200)
  })

  it('capture imagery layer', async () => {
    const body = {
      layers: [{ name: 'IMAGERY', category: 'BASE_LAYERS' }]
    }
    const res = await capture(body)
    expect(res.status).to.equal(200)
  })

  it('capture geojson file', async () => {
    const body = {
      features: [
        { type: 'Feature', geometry: { type: 'Point', coordinates: [3, 42.5] } },
        { type: 'Feature', geometry: { type: 'LineString', coordinates: [ [3, 42], [4, 43], [5,42], [6, 43]]  } },
        { type: 'Feature', geometry: { type: 'Polygon', coordinates: [ [ [0, 42], [1, 42], [1, 43], [0, 43], [0, 42] ] ] } }
      ]
    }
    const res = await capture(body)
    expect(res.status).to.equal(200)
  })
})

