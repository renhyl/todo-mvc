<script>
    import { createEventDispatcher } from 'svelte'
    import { handleClickType } from '$lib/utils/ClickType'
    import { toggleItem } from '$lib/ItemGraph'

    /**
     * @type {CustomInputProps} inputProps
     */
    export let inputProps

    /**
     * @type {Number}
     */
    export let delay = 300

    /**
     * @type {Function}
     */
    export let focusedCallback
    /**
     * @type {Function}
     */
    export let bluredCallback

    /**
     * @type {Function}
     */
    export let editStartCallback

    /**
     * @type {Boolean}
     */
    export let editing

    const dispatch = createEventDispatcher()

    /**
     * Bubbles up the click event
     * @param {Event} e
     */
    async function handleChange(e) {
        handleClickType({
            dispatch,
            delay,
            event: e,
            singleClickCallback: handleSingleClick,
            doubleClickCallback: handleDoubleClick
        })
    }

    /**
     * @typedef {Object} CustomInputProps
     * @property {String} id
     * @property {String} itemId
     * @property {Boolean} checked
     */

    $: ({ id, itemId, checked, ...otherProps } = inputProps)

    /**
     * @param {KeyboardEvent} e
     */
    async function handleKeyPress(e) {
        if (e.key !== 'Enter') return

        editStartCallback()
    }

    /**
     * Binds input's 'this' to a variable
     * @type {HTMLInputElement} checkbox
     */
    let checkbox

    async function handleSingleClick() {
        await toggleItem.mutate({ id: itemId, completed: checkbox?.checked })
    }

    function handleDoubleClick() {
        editStartCallback()
    }
</script>

<div class="todo-checkbox" class:editing>
    <input
        data-item-id={itemId}
        type="checkbox"
        class="toggle"
        on:click={handleChange}
        on:keypress={handleKeyPress}
        on:focus={() => focusedCallback()}
        on:blur={() => bluredCallback()}
        {checked}
        bind:this={checkbox}
        {id}
        {...otherProps}
    />
    <label data-testid="todo-title" for={id} class="row">
        <slot />
    </label>
</div>

<style>
    .row {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
    }

    .todo-checkbox {
        height: 60px;
    }

    .todo-checkbox.editing > .toggle {
        display: none;
    }
    .todo-checkbox.editing label {
        display: none;
    }
</style>
