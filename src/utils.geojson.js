import makeDebug from 'debug'
import _ from 'lodash'
import geojsonhint from '@mapbox/geojsonhint'

const debug = makeDebug('kapture:utils:geojson')

export function validateGeoJson (content) {
  // check the crs first
  if (content.crs) {
    debug('validateGeoJson: check crs', content.crs)
    // we support only named crs and expressed in WGS84
    const name = _.get(content.crs, 'properties.name')
    if (name) {
      const crs = name.toLowerCase()
      const allowedCrs = ['epsg:4326', 'urn:ogc:def:crs:OGC:1.3:CRS84', 'urn:ogc:def:crs:EPSG::4326']
      const isCrsValid = _.some(allowedCrs, (allowrdCrs) => { return allowrdCrs.toLowerCase() === crs })
      if (!isCrsValid) {
        return [{ message: `Invalid CRS: ${crs}` }]
      }
      delete content.crs
    }
  }
  // lint the geosjon file
  const messages = geojsonhint.hint(content)
  // filter the messages to find the errors
  const errors = _.filter(messages, message => { return _.get(message, 'level') !== 'message' })
  debug('validateGeoJson: lint errors', errors)
  return errors
}
