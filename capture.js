const puppeteer = require('puppeteer')
const _ = require('lodash')

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
          headless: false,
          args: [
            //'--headless',
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
              south: options.bbox[0], 
              west: options.bbox[1], 
              north: options.bbox[2], 
              east: options.bbox[3] })
            localStorage.setItem('kano-mapActivity-view', view)
          }
        }, options)
        await page.goto(options.url)
        // Proces the base layer
        await clickRightOpener(page)
        const baseLayerCategorySelector = '#KCatalogPanel\\.BASE_LAYERS'
        await page.waitForSelector(baseLayerCategorySelector)
        await page.click(baseLayerCategorySelector)
        await page.waitForTimeout(250)
        const baseLayerSelector = `#Layers\\.${options.baseLayer}`
        await page.waitForSelector(baseLayerSelector)
        await page.click(baseLayerSelector)
        await clickRightOpener(page)
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
