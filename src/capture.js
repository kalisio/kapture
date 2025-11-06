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
    headless: 'new',
    args: [
      '--no-sandbox',
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
  // Process the page language
  debug('configure the page language')
  await page.evaluateOnNewDocument((parameters) => {
    Object.defineProperty(navigator, 'language', {
      get: function () {
        return _.get(parameters, 'lang', 'en-US')
      }
    })
  }, parameters)
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
    window.localStorage.setItem(`${parameters.appName}-jwt`, parameters.jwt)
    window.localStorage.setItem(`${parameters.appName}-welcome`, false)
    window.localStorage.setItem(`${parameters.appName}-install`, false)
  }, parameters)
  // Goto the app url
  debug(`navigate to ${parameters.appName}`)
  const basePath = parameters.basePath || '/#/home'
  let url = parameters.url + (basePath.endsWith('/') ? basePath.substring(0, basePath.length - 1) : basePath)
  try {
    if (_.has(parameters, 'activity')) url += `/${parameters.activity}`
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
    debug(`computed ${parameters.appName} url:`, url)
    await page.goto(url)
    await new Promise(resolve => setTimeout(resolve, 1000))
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
    // Write the file for dropping it
    debug('writing temporary geojson file:', tmpGeoJsonFile)
    writeTmpFile(tmpGeoJsonFile, JSON.stringify(parameters))
    debug('uploading temporary geosjon file')
    await new Promise(resolve => setTimeout(resolve, 500))
    const uploader = await page.waitForSelector('#dropFileInput', { timeout: 5000 })
    if (uploader) {
      await uploader.uploadFile(path.join(getTmpDirName(), tmpGeoJsonFile))
      await new Promise(resolve => setTimeout(resolve, 1000))
    } else {
      console.error('<!> upload features file failed: unable to find the #dropFileInput element')
    }
    // Delete the file
    debug('deleting temporary geojson file')
    deleteTmpFile(tmpGeoJsonFile)
  }
  // Wait for the network to be idle
  debug('wait for network to be idle')
  try {
    await page.waitForNetworkIdle({
      timeout: parameters.networkdIdleTimeout,
      idleTime: 1000
    })
  } catch (error) {
    console.error(`<!> wait for networkd idle failed: ${error.message}`)
  }
  // Process the layout components
  debug('waiting for $layout to be defined and ready...')
  await page.waitForFunction(() => window.$layout !== undefined && typeof window.$layout.set === 'function')
  debug('$layout detected and ready')
  const layout = _.get(parameters, 'layout', defaultLayout)
  debug('applying layout configuration:', layout)
  await page.evaluate((layout) => {
    try {
      window.$layout.set(layout)
    } catch (err) {
      console.error('error while applying layout:', err)
    }
  }, JSON.parse(JSON.stringify(layout)))

  // Wait for the page to be rendered
  debug('wait for extra delay', parameters.delay)
  await new Promise(resolve => setTimeout(resolve, parameters.delay))
  // Take the screenshot
  debug('take the screenshot')
  const buffer = await page.screenshot({ fullPage: true, type: 'png' })
  await browser.close()
  // Return the screenshot as a buffer
  return buffer
}
