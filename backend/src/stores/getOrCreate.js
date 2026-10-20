/**
 * @template K, V
 * @param {Map<K, V>} map
 * @param {K} key
 * @param {() => NoInfer<V>} create
 * @returns {V}
 */
export const getOrCreate = (map, key, create) => {
    let value = map.get(key)
    if (value === undefined) {
        value = create()
        map.set(key, value)
    }
    return value
}
