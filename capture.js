import _  from 'lodash'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import puppeteer from 'puppeteer'

const tmpDir = process.env.TMP_DIR || './tmp'
const slowMo = process

/** helper functions
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

async function clickSelector (page, selector, wait = 250) {
  try {
    await page.waitForSelector(selector, { timeout: 2000 })
    await page.click(selector)
    await page.waitForTimeout(wait)
  } catch (error) {
    console.log(`${selector} does not exist.`)
  }
}

async function getLayerCategoryId (page, layerId) {
  const xpath = `//div[contains(@class, "q-expansion-item q-item-type") and .//div[@id="${layerId}"]]`
  const elements = await page.$x(xpath)
  if (elements.length > 0) return (await elements[0].getProperty('id')).jsonValue()
  return undefined
}

/** Main capture function
 */
 export async function capture (parameters) {
  console.log('capture requested with the following parameters: ', _.omit(parameters, 'jwt'))
  // Create tmp directory if needed
  createTmpDir()
  // Define a temporary feature file
  const tmpGeoJsonFile = 'features-' + crypto.randomBytes(4).readUInt32LE(0) + '.json'
  // Instanciate the browser
  const browser = await puppeteer.launch({
    //headless: false,
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
  page.on('error', err=> { 
    console.error('error happen at the page: ', err) 
  })
  page.on('pageerror', pageerr=> { 
    console.error('pageerror occurred: ', pageerr) 
  })
  // Process the page viewport
  await page.setViewport({
    width: _.get(parameters, 'size.width', 1024),
    height: _.get(parameters, 'size.height', 768),
    deviceScaleFactor: 1
  })
  // Process the local storage items
  await page.evaluateOnNewDocument(parameters => {
    localStorage.clear();
    localStorage.setItem('kano-jwt', parameters.jwt)
    localStorage.setItem('kano-welcome', false)
    // set the bbox view if not needed to render additional features
    if (parameters.bbox && !parameters.features) {
      const view = JSON.stringify({ 
        west: parameters.bbox[0],
        south: parameters.bbox[1],
        east: parameters.bbox[2],
        north: parameters.bbox[3]
      })
      localStorage.setItem('kano-mapActivity-view', view)
    }
  }, parameters)
  // Goto the kano url
  await page.goto(parameters.url)
  await page.waitForTimeout(500)
  // Process the layers
  if (parameters.layers) {
    // Open the catalog
    await clickSelector(page, '#right-opener')
    await page.waitForTimeout(250)
    let openedCategories = []
    for (let i = 0; i < parameters.layers.length; ++i) {
      const layerId = parameters.layers[i]
      const categoryId = await getLayerCategoryId(page, layerId)
      if (!openedCategories.includes(categoryId)) {
        await clickSelector(page, `#${categoryId}`)
        openedCategories.push(categoryId)
      }
      let layerSelector = `#${layerId}`
      if (categoryId !== 'k-catalog-panel-base-layers') layerSelector += ' .q-toggle'
      await clickSelector(page, layerSelector)
    }
  }
  // Process the features
  if (parameters.features) {
    const collection = JSON.stringify({
      type: 'FeatureCollection',
      features: parameters.features
    })
    writeTmpFile(tmpGeoJsonFile, collection)
    const loaderSelector = '#dropFileInput'
    try {
      const loader = await page.$(loaderSelector)
      await loader.uploadFile(path.join(tmpDir, tmpGeoJsonFile))
    } catch (error) {
      console.error(`Upload features file failed: ${error}`)
    }
    await page.waitForTimeout(500)
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
    await page.waitForTimeout(1000)
  } catch(error) {
    console.error(`Wait for networkd idle failed: ${error}`)
  }
  // Take the screenshot
  const buffer = await page.screenshot({ fullPage: true, type: 'png' })
  await browser.close()  
  // Return the image as a buffer
  return buffer
}
