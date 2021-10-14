import _  from 'lodash'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import puppeteer from 'puppeteer'

const tmpDir = process.env.TMP_DIR || './tmp'

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
    await page.waitForSelector(selector, { timeout: 1000 })
    await page.click(selector)
    await page.waitForTimeout(wait)
  } catch (error) {
    console.log(`${selector} does not exist.`)
  }
}

async function clickRightOpener (page) {
  await clickSelector(page, '#right-opener')
}

/** Main capture function
 */
export function capture (parameters) {
  console.log('capture requested with the following parameters: ', _.omit(parameters, 'jwt'))
  createTmpDir()
  return new Promise((resolve, reject) => {
    (async () => {
      try {
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
        // Process the layers
        if (parameters.layers) {
          await clickRightOpener(page)
          for (let layer of parameters.layers) {
            // Click the category
            clickSelector(page,  `#k-catalog-panel-${_.kebabCase(layer.category)}`)
            // Click the layer
            let layerSelector = `#layers-${_.kebabCase(layer.name)}`
            if (layer.category !== 'BASE_LAYERS') layerSelector += ' .q-toggle'
            clickSelector(page, layerSelector)        
          }
        }
        // Process the features
        if (parameters.features) {
          const collection = JSON.stringify({
            type: 'FeatureCollection',
            features: parameters.features
          })
          writeTmpFile(tmpGeoJsonFile, collection)
          await page.waitForTimeout(500)
          const loaderSelector = '.leaflet-control-filelayer input[type="file"]'
          const loader = await page.$(loaderSelector)
          await loader.uploadFile(path.join(tmpDir, tmpGeoJsonFile))
          await page.waitForTimeout(500)
        }
        // Hide the layout components
        await page.evaluate(() => {
          window.$store.set('topPane.content', null)
          window.$store.set('bottomPane.content', null)
          window.$store.set('rightPane.content', null)
          window.$store.set('leftPane.content', null)
          window.$store.set('fab.actions', [])
        })
        // Wait for the tiles to be loaded
        await page.evaluate(async () => {
          const imageSelectors = Array.from(document.querySelectorAll("img"));
          await Promise.all(imageSelectors.map(img => {
            if (img.complete) return
            return new Promise((resolve, reject) => {
              img.addEventListener('load', resolve)
              img.addEventListener('error', reject)
            })
          }))
        })
        // Additional wait to handle transparency animation
        await page.waitForTimeout(2000)
        // Take the screenshot
        const buffer = await page.screenshot({ fullPage: true, type: 'png' })
        await browser.close()
        // Remove temporary file if nedded
        deleteTmpFile(tmpGeoJsonFile)
        // Return the image as a buffer
        resolve(buffer)
      } catch (err) {
        reject(err)
      }
    })()
  })
}
