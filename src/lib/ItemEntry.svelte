<script>
    // global imports
    import { graphql, fragment } from '$houdini'
    import { deleteItem, textChangeItem } from '$lib/ItemGraph'

    // local imports
    import CheckboxLabel from '$lib/components/checkbox/CheckboxLabel.svelte'

    // the reference we're passed from our parents
    /** @type { import('$houdini').ItemEntry_item|null } */
    export let data
    /** @type {() => Promise<void>} */
    export let focusCallBack

    /**
     * @type {Boolean}
     */
    export let toggleAllChecked

    /** @type {Boolean} */
    $: editing = false

    // get the information we need about the item
    $: item = fragment(
        data,
        graphql`
            fragment ItemEntry_item on TodoItem {
                id
                text
                completed
                createdAt
            }
        `
    )

    $: completed = toggleAllChecked ? toggleAllChecked : $item?.completed || false

    $: checkboxProps = {
        itemId: $item?.id || '',
        id: 'todo-' + $item?.id + '-' + $item?.text || '',
        text: $item?.text || '',
        checked: completed
    }

    $: text = $item?.text || ''

    /** @type {HTMLInputElement} */
    let editInput
    /**
     * @type {Boolean}
     */
    let focused = false
    /**
     * @type {Boolean}
     */
    let focusedDestroy = false

    /**
     * @return void
     */
    async function handleEditStart() {
        editing = true

        setTimeout(async () => {
            await editInput.focus()
        }, 10)
    }

    /**
     * @param {HTMLInputElement} e
     */
    async function handleEditEnd(e) {
        editing = false

        if (e.value.trim() === $item?.text) return // if nothing changed early return
        if (e.value.trim().length === 0) {
            // todo - delete item
            await deleteItem.mutate({ id: $item?.id })

            return
        }

        const oldText = text

        try {
            text = e.value.trim() // update display text
            await textChangeItem.mutate({ id: $item?.id, text: e.value.trim() }) // send update
        } catch (error) {
            text = oldText // revert display text
        }

        setTimeout(async () => {
            await focusCallBack() // focus goes back to new todo input field
        }, 10)
    }

    /**
     * @param {KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }} e
     */
    async function handleKeyboardEdit(e) {
        if (e.key !== 'Enter' || !editing) return

        handleEditEnd(e.currentTarget)
    }

    /**
     * @param {FocusEvent & { currentTarget: EventTarget & HTMLInputElement }} e
     */
    async function handleMouseEdit(e) {
        if (!editing) return

        handleEditEnd(e.currentTarget)
    }

    function handleEditCancel() {
        editing = false
        editInput.value = $item?.text || ''
    }

    function handleKeyboardDestroyFocus() {
        focusedDestroy = true
    }
    function handleKeyboardDestroyBlur() {
        focusedDestroy = false
        focused = false
    }

    function focusedCallback() {
        focused = true
    }

    function bluredCallback() {
        setTimeout(() => {
            if (focusedDestroy) return
            focused = false
        }, 100)
    }

    /**
     * @param {KeyboardEvent} e
     */
    function handleKeydown(e) {
        if (e.key !== 'Escape') return

        handleEditCancel()
    }
</script>

<li class:editing class:completed>
    <CheckboxLabel
        inputProps={checkboxProps}
        delay={180}
        {editing}
        {focusedCallback}
        {bluredCallback}
        editStartCallback={handleEditStart}
    >
        {text.length > 28 ? text.substring(0, 28) + '..' : text || ''}
        <span class="timestamp">
            {$item?.createdAt.toLocaleDateString('en-US') || ''}
        </span>
    </CheckboxLabel>
    <button
        class={focused ? 'destroy keyboard-focused' : 'destroy'}
        on:click={() => deleteItem.mutate({ id: $item?.id })}
        on:focus={handleKeyboardDestroyFocus}
        on:blur={handleKeyboardDestroyBlur}
    />
    <input
        aria-label="Edit todo item"
        class="edit"
        type="text"
        value={$item?.text}
        on:blur={handleMouseEdit}
        on:keydown={handleKeydown}
        on:keypress={handleKeyboardEdit}
        bind:this={editInput}
    />
</li>

<style>
    .editing {
        border-bottom: 1px solid #ccc;
    }
    .edit {
        position: absolute;
        top: 0;
        width: 100%;
        height: 100%;
    }
    .timestamp {
        font-size: 14px;
        margin-top: 4px;
        margin-right: 50px;
    }
    .destroy,
    input {
        cursor: pointer;
    }

    .todo-list li .destroy:after {
        margin-top: 4px;
    }

    .todo-list li label span {
        margin-top: 6px;
    }

    .todo-list li.editing .edit {
        display: block;
        width: 100%;
        margin: 0;
        padding: 12px 59px;
        height: 60px;
    }

    .keyboard-focused {
        display: block;
    }
</style>
