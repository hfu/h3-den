const shapefile = require('shapefile')
const h3 = require('h3-js')

let dict = {}
const add = (h3) => {
  if (dict[h3]) {
    dict[h3]++
  } else {
    dict[h3] = 1
  }
}

const push = f => {
  if (!f.geometry.type === 'LineString') {
    throw new Error(`${f.geometry.type} not supported.`)
  }
  for (let a of f.geometry.coordinates) {
    add(h3.geoToH3(a[1], a[0], 5))
  }
}

shapefile.open('coastl_jpn.shp')
  .then(source => source.read()
    .then(function process (result) {
      if (result.done) return
      push(result.value)
      return source.read().then(process)
    }))
  .then(() => {
    let geojson = {
      type: 'FeatureCollection',
      features: []
    }
    for (const k in dict) {
      let coords = h3.h3ToGeoBoundary(k)
      for (let i = 0; i < coords.length; i++) {
        let v = coords[i][0]
        coords[i][0] = coords[i][1]
        coords[i][1] = v
      }
      coords.push(coords[0])
      geojson.features.push({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [coords]
        },
        properties: {
          'h3': k,
          'count': dict[k]
        }
      })
    }
    console.log(JSON.stringify(geojson))
  })
  .catch(error => console.error(error.stack))
