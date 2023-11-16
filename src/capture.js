import makeDebug from 'debug'
import _ from 'lodash'
import path from 'path'
import crypto from 'crypto'
import puppeteer from 'puppeteer'
import { defaultLayout } from './utils.layout.js'
import { getTmpDirName, createTmpDir, writeTmpFile, deleteTmpFile } from './utils.fs.js'

const debug = makeDebug('kapture:capture')

/**
 *  Main capture function
 */
export async function capture (parameters) {
  console.log('[KAPTURE] capture requested with the following parameters: ', _.omit(parameters, 'jwt'))
  // Instanciate the browser
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--headless',
      '--hide-scrollbars',
      '--enable-webgl',
      '--disable-gpu',
      '--disable-dev-shm-usage'
    ]
  })
  // Create the page and listen to page errors
  debug('create the page')
  const page = await browser.newPage()
  page.on('error', error => {
    console.error('<!> error happen at the page: ', error)
  })
  page.on('pageerror', error => {
    console.error('<!> pageerror occurred: ', error)
  })
  // Process the page viewport
  debug('configure the page viewport')
  try {
    await page.setViewport({
      width: _.get(parameters, 'size.width', 1024),
      height: _.get(parameters, 'size.height', 768),
      deviceScaleFactor: 1
    })
  } catch (error) {
    console.error(`<!> setting viewport failed: ${error}`)
    return null
  }
  // Process the local storage items
  debug('configure the local storage')
  await page.evaluateOnNewDocument(parameters => {
    window.localStorage.clear()
    window.localStorage.setItem('kano-jwt', parameters.jwt)
    window.localStorage.setItem('kano-welcome', false)
  }, parameters)
  // Goto the kano url
  debug('navigate to kano')
  let url = parameters.url + '/#/home/'
  try {
    url += (parameters.activity === 'globe' ? 'globe' : 'map')
    if (parameters.bbox && !parameters.type) {
      url += `/${parameters.bbox[1]}/${parameters.bbox[0]}/${parameters.bbox[3]}/${parameters.bbox[2]}`
    }
    const queryParams = []
    if (parameters.time) {
      queryParams.push(`time=${parameters.time}`)
    }
    _.forEach(parameters.layers, layer => {
      queryParams.push(`layers=${layer}`)
    })
    if (!_.isEmpty(queryParams)) url += `?${_.join(queryParams, '&')}`
    debug('computed kano url:', url)
    await page.goto(url)
    await page.waitForTimeout(500)
  } catch (error) {
    console.error(`<!> navigate to ${url} failed: ${error}`)
    return null
  }
  // Process the features
  if (parameters.type === 'FeatureCollection' || parameters.type === 'Feature') {
    debug('process the features')
    // Create tmp directory if needed
    createTmpDir()
    // Define a temporary feature file name
    const tmpGeoJsonFile = 'features-' + crypto.randomBytes(4).readUInt32LE(0) + '.json'
    // Write the file for droping it
    debug('writing temporary geojson file:', tmpGeoJsonFile)
    writeTmpFile(tmpGeoJsonFile, JSON.stringify(parameters))
    try {
      debug('uploading temporary geosjon file')
      await page.waitForTimeout(250)
      const loader = await page.$('#dropFileInput')
      await loader.uploadFile(path.join(getTmpDirName(), tmpGeoJsonFile))
      await page.waitForTimeout(250)
    } catch (error) {
      console.error(`<!> upload features file failed: ${error}`)
    }
    // Delete the file
    debug('deleting temporary geojson file')
    deleteTmpFile(tmpGeoJsonFile)
  }
  // Process the layout components
  debug('process the layout components')
  const layout = _.get(parameters, 'layout', defaultLayout)
  await page.evaluate((layout) => {
    window.$layout.set(layout)
  }, layout)
  // Wait for the network to be idle
  debug('wait for network to be idle')
  try {
    await page.waitForNetworkIdle({ timeout: parameters.networkdIdleTimeout })
  } catch (error) {
    console.error(`<!> wait for networkd idle failed: ${error}`)
  }
  // Wait for the page to be rendered
  debug('wait for extra delay')
  await page.waitForTimeout(parameters.delay)
  // Take the screenshot
  debug('take the screenshot')
  const buffer = await page.screenshot({ fullPage: true, type: 'png' })
  await browser.close()
  // Return the screenshot as a buffer
  return buffer
}
