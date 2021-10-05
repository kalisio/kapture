const puppeteer = require('puppeteer')

function capture (url, jwt, options) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        const browser = await puppeteer.launch({
          headless: false,
          args: [
            '--headless',
            '--hide-scrollbars',
            '--mute-audio'
          ]
        })
        const page = await browser.newPage()

        page.on('error', err=> {
          console.log('error happen at the page: ', err);
        });
      
        page.on('pageerror', pageerr=> {
          console.log('pageerror occurred: ', pageerr);
        })

        await page.setViewport({
          width: options.width || 1024,
          height: options.height || 700,
          deviceScaleFactor: 1
        })
        await page.evaluateOnNewDocument(jwt => {
          localStorage.clear();
          localStorage.setItem('kano-jwt', jwt)
          localStorage.setItem('kano-welcome', false)
        }, jwt)
        await page.goto(url)
        // Activate the desiredBaseLayer
        await page.waitForSelector('#right-opener')
        await page.click('#right-opener')
        await page.waitForSelector('#KCatalogPanel\\.METEO_LAYERS')
        await page.click('#KCatalogPanel\\.METEO_LAYERS') 
        await page.waitForTimeout(2000)
        //let baseLayerSelector = '#Layers\\.IMAGERY .q-radio'
        //await page.evaluate((selector) => document.querySelector(selector).click(), baseLayerSelector)
        let meteoSelector = '#Layers\\.GUST_TILED .q-item__label'
        await page.waitForSelector(meteoSelector)
        await page.evaluate((selector) => document.querySelector(selector).click(), meteoSelector)
        // close the menu 
        //await page.click('#right-opener')
        // Wait for the tiles to be loaded
        // https://stackoverflow.com/questions/46160929/puppeteer-wait-for-all-images-to-load-then-take-screenshot
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
        // Handle transparency animation when rendering 
        await page.waitForTimeout(3000)
        
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
