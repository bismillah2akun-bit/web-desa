function toFeature(record, source) {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [Number(record.longitude), Number(record.latitude)],
    },
    properties: {
      id: record.id,
      name: record.name,
      category: record.category,
      address: record.address,
      description: record.description,
      source,
    },
  }
}

function createFeatureCollection(facilities, potentials) {
  return {
    type: 'FeatureCollection',
    features: [
      ...facilities.map((item) => toFeature(item, 'facility')),
      ...potentials.map((item) => toFeature(item, 'potential')),
    ],
  }
}

module.exports = { createFeatureCollection }
