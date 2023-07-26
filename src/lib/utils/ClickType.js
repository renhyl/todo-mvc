/**
 * @type {boolean}
 */
let waiting = false
/**
 * @type {NodeJS.Timeout}
 */
let timeout = setTimeout(() => {}, 0)

/**
 *
 * @typedef {Object} ClickTypeOptions
 * @property {function} dispatch
 * @property {number} delay
 * @property {Event} event
 * @property {function} singleClickCallback
 * @property {function} doubleClickCallback
 *
 * @param {ClickTypeOptions} options
 * @returns {Promise<void>}
 */
export async function handleClickType({
    dispatch,
    delay = 300,
    event,
    singleClickCallback,
    doubleClickCallback
}) {
    if (waiting) {
        clearTimeout(timeout)
        await dispatch('singleclick', event)
        await doubleClickCallback()
        waiting = false

        return
    }
    waiting = true
    timeout = setTimeout(async () => {
        await dispatch('doubleclick', event)
        await singleClickCallback()
        waiting = false
    }, delay)
}
