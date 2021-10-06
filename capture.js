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
        const browser = await puppeteer.launch({
          //headless: false,
          args: [
            '--headless',
            '--hide-scrollbars',
            '--mute-audio'
          ]
        })
        const page = await browser.newPage()
        // Listen to page error events
        page.on('error', err=> {
          console.log('error happen at the page: ', err);
        });
        page.on('pageerror', pageerr=> {
          console.log('pageerror occurred: ', pageerr);
        })
        // Process the page viewport
        await page.setViewport({
          width: options.width || 1024,
          height: options.height || 700,
          deviceScaleFactor: 1
        })
        // Process the storage items
        await page.evaluateOnNewDocument(options => {
          localStorage.clear();
          localStorage.setItem('kano-jwt', options.jwt)
          localStorage.setItem('kano-welcome', false)
          if (options.bbox) {
            const view = JSON.stringify({ 
              west: options.bbox[0],
              south: options.bbox[1],
              east: options.bbox[2],
              north: options.bbox[3]
            })
            localStorage.setItem('kano-mapActivity-view', view)
          }
        }, options)
        await page.goto(options.url)
        // Proces the base layer
        if (options.layer) {
          await clickRightOpener(page)
          const baseLayerCategorySelector = '#KCatalogPanel\\.BASE_LAYERS'
          await page.waitForSelector(baseLayerCategorySelector)
          await page.click(baseLayerCategorySelector)
          await page.waitForTimeout(250)
          const baseLayerSelector = `#Layers\\.${options.layer}`
          await page.waitForSelector(baseLayerSelector)
          await page.click(baseLayerSelector)
          //await clickRightOpener(page)
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
