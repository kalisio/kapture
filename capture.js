const _ = require('lodash')
const fs = require('fs')
const puppeteer = require('puppeteer')

/** helper function to click on the right opener
 */
async function clickRightOpener (page) {
  await page.waitForSelector('#right-opener')
  await page.click('#right-opener')
}

/** Main capture function
 */
function capture (parameters) {
  console.log('capture requested with the following parameters: ', parameters)
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        // Instanciate the browser
        const browser = await puppeteer.launch({
          //headless: false,
          args: [
            '--headless',
            '--hide-scrollbars',
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
          for (layer of parameters.layers) {
            const catergorySelector = `#k-catalog-panel-${_.kebabCase(layer.category)}`
            try {
              await page.waitForSelector(catergorySelector, { timeout: 1000 })
              await page.click(catergorySelector)
              await page.waitForTimeout(250)
            } catch (error) {
              console.log(`Category ${layer.category} does not exist.`)
            }
            let layerSelector = `#layers-${_.kebabCase(layer.name)}`
            if (layer.category !== 'BASE_LAYERS') layerSelector += ' .q-toggle'
            try {
              await page.waitForSelector(layerSelector, { timeout: 1000 })
              await page.click(layerSelector)
              await page.waitForTimeout(250)
            } catch (error) {
              console.log(`Layer ${layer.name} does not exist.`)
            }            
          }
        }
        // Process the features
        if (parameters.features) {
          const collection = JSON.stringify({
            type: 'FeatureCollection',
            features: parameters.features
          })
          fs.writeFileSync('features.json', collection)
          await page.waitForTimeout(500)
          const loaderSelector = '.leaflet-control-filelayer input[type="file"]'
          const loader = await page.$(loaderSelector)
          await loader.uploadFile('features.json')
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
        await page.waitForTimeout(1000)
        // Take the screenshot
        buffer = await page.screenshot({ fullPage: true, type: 'png' })
        await browser.close()
        resolve(buffer)
      } catch (err) {
        reject(err)
      }
    })()
  })
}

module.exports = capture
