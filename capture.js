import _  from 'lodash'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import puppeteer from 'puppeteer'

const tmpDir = process.env.TMP_DIR || './tmp'

/** 
 * helper functions
 */
function createTmpDir () {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recusrive: true })
  }
}

function writeTmpFile (file, content) {
  const filePath = path.join(tmpDir, file)
  fs.writeFileSync(filePath, content)
}

function deleteTmpFile (file) {
  const filePath = path.join(tmpDir, file)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

/** 
 *  Main capture function
 */
 export async function capture (parameters) {
  console.log('<> capture requested with the following parameters: ', _.omit(parameters, 'jwt'))
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
  const page = await browser.newPage()
  page.on('error', error => { 
    console.error('<!> error happen at the page: ', error) 
  })
  page.on('pageerror', error => { 
    console.error('<!> pageerror occurred: ', error) 
  })
  // Process the page viewport
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
  await page.evaluateOnNewDocument(parameters => {
    localStorage.clear();
    localStorage.setItem('kano-jwt', parameters.jwt)
    localStorage.setItem('kano-welcome', false)
  }, parameters)
  // Goto the kano url
  let url = parameters.url + '/#/home/'
  try {
    url += (parameters.activity === 'globe' ? 'globe' : 'map')
    if (parameters.bbox && !parameters.type) {
      url += `/${parameters.bbox[1]}/${parameters.bbox[0]}/${parameters.bbox[3]}/${parameters.bbox[2]}`
    }
    let queryParams = []
    if (parameters.time) {
      queryParams.push(`time=${parameters.time}`)
    }
    _.forEach(parameters.layers, layer => {
      let layerId = layer
      if (!_.startsWith(layer, 'Layers.')) {
        if (!_.startsWith(layer, 'layers-')) layer = 'layers-' + layer
        layerId = _.replace(_.replace(_.upperCase(layer), / /g, '_'), 'LAYERS_', 'Layers.')
      }
      console.log(layerId)
      queryParams.push(`layers=${layerId}`)
    })
    if (!_.isEmpty(queryParams)) url += `?${_.join(queryParams, '&')}`
    await page.goto(url)
    await page.waitForTimeout(500)
  } catch (error) {
    console.error(`<!> navigate to ${url} failed: ${error}`)
    return null
  }
  // Process the features
  if (parameters.type === 'FeatureCollection' || parameters.type === 'Feature') {
    // Create tmp directory if needed
    createTmpDir()
    // Define a temporary feature file name
    const tmpGeoJsonFile = 'features-' + crypto.randomBytes(4).readUInt32LE(0) + '.json'
    // Write the file for droping it
    writeTmpFile(tmpGeoJsonFile,  JSON.stringify(parameters))
    try {
      await page.waitForTimeout(250)
      const loader = await page.$('#dropFileInput')
      await loader.uploadFile(path.join(tmpDir, tmpGeoJsonFile))
      await page.waitForTimeout(250)
    } catch (error) {
      console.error(`<!> upload features file failed: ${error}`)
    }
    // Delete the file
    deleteTmpFile(tmpGeoJsonFile)
  }
  // Hide the layout components
  await page.evaluate(() => {
    window.$store.set('topPane.content', null)
    window.$store.set('bottomPane.content', null)
    window.$store.set('rightPane.content', null)
    window.$store.set('leftPane.content', null)
    window.$store.set('fab.actions', [])
  })
  // Wait for the network to be idle
  try {
    await page.waitForNetworkIdle({ timeout: 15000 })
    await page.waitForTimeout(parameters.activity === 'globe' ? 5000 : 2000)
  } catch(error) {
    console.error(`<!> wait for networkd idle failed: ${error}`)
  }
  // Take the screenshot
  const buffer = await page.screenshot({ fullPage: true, type: 'png' })
  await browser.close()  
  // Return the screenshot as a buffer
  return buffer
}
