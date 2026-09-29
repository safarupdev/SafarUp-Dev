/**
 * Batched relation resolution for Destination lists.
 *
 * The single most important Firestore rule in Phase 2, and the reason this
 * module exists (FIRESTORE.destination.contract.md §5):
 *
 * A Destination list of 20 items must NOT trigger 20 × 3 = 60 document
 * reads. Instead, this module collects every referenced ID across the whole
 * page and performs **one read per referenced collection**.
 *
 * For 20 destinations that is 3 reads total, not 60.
 */

const districtRepository = require('../repositories/district.repository');
const categoryRepository = require('../repositories/category.repository');
const placeRepository = require('../repositories/place.repository');

/**
 * @param {Array<object>} destinations
 * @returns {Promise<Array<{ destination: object, district: ?object, categories: object[], places: object[] }>>}
 */
async function resolveBatchReferences(destinations) {
  const list = destinations || [];
  if (list.length === 0) return [];

  // Collect the union of every referenced ID exactly once.
  const districtIds = new Set();
  const categoryIds = new Set();
  const placeIds = new Set();

  for (const destination of list) {
    if (destination.districtId) districtIds.add(destination.districtId);
    for (const id of destination.categoryIds ?? []) categoryIds.add(id);
    for (const id of destination.placeIds ?? []) placeIds.add(id);
  }

  // Three reads, regardless of how many destinations are on the page.
  const [districts, categories, places] = await Promise.all([
    districtRepository.getMany([...districtIds]),
    categoryRepository.getMany([...categoryIds]),
    placeRepository.getMany([...placeIds]),
  ]);

  return list.map((destination) => ({
    destination,
    district: districts.get(destination.districtId)
      ? {
          id: destination.districtId,
          slug: districts.get(destination.districtId).slug,
          name: districts.get(destination.districtId).name,
        }
      : null,
    categories: (destination.categoryIds ?? [])
      .map((id) => categories.get(id))
      .filter(Boolean)
      .map((c) => ({ id: c._id, slug: c.slug, name: c.name })),
    places: (destination.placeIds ?? [])
      .map((id) => places.get(id))
      .filter(Boolean)
      .map((p) => ({ id: p._id, slug: p.slug, name: p.name })),
  }));
}

module.exports = { resolveBatchReferences };
