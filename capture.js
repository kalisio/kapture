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
function capture (options) {
  console.log('capture requested with the following options: ', options)
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        // Instanciate the browser
        const browser = await puppeteer.launch({
          args: [
            '--headless',
            '--hide-scrollbars',
            '--mute-audio'
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
          width: options.width || 1024,
          height: options.height || 700,
          deviceScaleFactor: 1
        })
        // Process the local storage items
        await page.evaluateOnNewDocument(options => {
          localStorage.clear();
          localStorage.setItem('kano-jwt', options.jwt)
          localStorage.setItem('kano-welcome', false)
          // set the bbox view if not needed to render additional features
          if (options.bbox && !options.features) {
            const view = JSON.stringify({ 
              west: options.bbox[0],
              south: options.bbox[1],
              east: options.bbox[2],
              north: options.bbox[3]
            })
            localStorage.setItem('kano-mapActivity-view', view)
          }
        }, options)
        // Goto the kano url
        await page.goto(options.url)
        // Process the layers
        if (options.layers) {
          await clickRightOpener(page)
          // process the base layer
          const baseLayer = _.find(options.layers, { category: 'BaseLayer' })
          if (baseLayer) {
            const baseLayerCategorySelector = '#KCatalogPanel\\.BASE_LAYERS'
            await page.waitForSelector(baseLayerCategorySelector)
            await page.click(baseLayerCategorySelector)
            await page.waitForTimeout(250)
            const baseLayerSelector = `#Layers\\.${baseLayer.name}`
            try {
              await page.waitForSelector(baseLayerSelector, { timeout: 1000 })
              await page.click(baseLayerSelector)
            } catch (error) {
              console.log(`Base layer ${baseLayer.name} does not exist.`)
            }            
          }
        }
        if (options.features) {
          const collection = JSON.stringify({
            type: 'FeatureCollection',
            features: options.features
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
