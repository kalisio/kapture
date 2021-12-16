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

async function clickSelector (page, selector, wait = 250) {
  try {
    await page.waitForSelector(selector, { timeout: 2000 })
    await page.click(selector)
    await page.waitForTimeout(wait)
  } catch (error) {
    console.error(`${selector} does not exist.`)
  }
}

async function getLayerCategoryId (page, layerId) {
  const xpath = `//div[contains(@class, "q-expansion-item q-item-type") and .//div[@id="${layerId}"]]`
  const elements = await page.$x(xpath)
  if (elements.length > 0) return (await elements[0].getProperty('id')).jsonValue()
  return undefined
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
  let url = parameters.url + '/#/home/map'
  try {
    if (parameters.bbox && !parameters.type) {
      url += `${parameters.bbox[1]}/${parameters.bbox[0]}/${parameters.bbox[3]}/${parameters.bbox[2]}`
    }
    if (parameters.time) {
      url += `?time=${parameters.time}`
    }
    await page.goto(url)
    await page.waitForTimeout(500)
  } catch (error) {
    console.error(`<!> navigate to ${parameters.url} failed: ${error}`)
    return null
  }
  // Process the layers
  if (parameters.layers) {
    // Open the catalog
    await clickSelector(page, '#right-opener')
    await page.waitForTimeout(1000)
    let openedCategories = []
    for (let i = 0; i < parameters.layers.length; ++i) {
      let layerId = parameters.layers[i]
      if (!_.startsWith(layerId, 'layers-')) layerId = 'layers-' + _.kebabCase(layerId)
      const categoryId = await getLayerCategoryId(page, layerId)
      if (categoryId) {
        if (!openedCategories.includes(categoryId)) {
          await clickSelector(page, `#${categoryId}`)
          openedCategories.push(categoryId)
        }
      }
      let layerSelector = `#${layerId}`
      if (categoryId !== 'k-catalog-panel-base-layers') layerSelector += ' .q-toggle'
      await clickSelector(page, layerSelector)
    }
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
    await page.waitForTimeout(1000)
  } catch(error) {
    console.error(`<!> wait for networkd idle failed: ${error}`)
  }
  // Take the screenshot
  const buffer = await page.screenshot({ fullPage: true, type: 'png' })
  await browser.close()  
  // Return the screenshot as a buffer
  return buffer
}
