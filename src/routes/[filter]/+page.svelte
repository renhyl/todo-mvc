<script>
    import { page } from '$app/stores'
    import ItemEntry from '$lib/ItemEntry.svelte'
    import { derived } from 'svelte/store'
    import {
        newItemSubscription,
        addItem,
        toggleItems,
        deleteCompleteItems,
        deletedItemSubscription,
        toggleAllSubscription,
        itemUpdateSubscription,
        deletedCompleteItemsSubscription
    } from '$lib/ItemGraph'
    import { onMount } from 'svelte'

    /** @type { import('./$houdini').PageData } */
    export let data

    /**
     * @type {HTMLInputElement}
     */
    let todoInput

    $: ({ AllItems } = data)
    $: newItemSubscription.listen() // listen for new items
    $: deletedItemSubscription.listen() // listen for deleted item
    $: toggleAllSubscription.listen() // listen for items updates (completed) toggle all
    $: itemUpdateSubscription.listen() // listen for item updates (text, completed)
    $: deletedCompleteItemsSubscription.listen() // listen for deleted items (all)
    $: numberOfItems = $AllItems.data?.allItems.edges.length || 0
    $: numberOfFilteredItems = $AllItems.data?.filteredItems.edges.length || 0
    $: itemsLeft =
        $AllItems.data?.allItems?.edges.filter(({ node: item }) => !item?.completed).length || 0
    $: toggleAllChecked = !$AllItems.data?.filteredItems.edges.some(
        (item) => item?.node?.completed === false
    )

    $: completedCount = numberOfItems - itemsLeft

    onMount(function () {
        todoInput.focus()
    })

    async function todoInputFocus() {
        await todoInput.focus()
    }

    const currentPage = derived(page, ($page) => {
        if ($page.url.pathname.includes('active')) {
            return 'active'
        } else if ($page.url.pathname.includes('completed')) {
            return 'completed'
        }

        return 'all'
    })

    let inputValue = ''
    async function addInput() {
        if (!inputValue) return

        // trigger the mutation
        await addItem.mutate({ input: { text: inputValue.trim() } })

        // clear the input
        inputValue = ''

        await todoInput.focus() // focus goes back to new todo input field
    }

    /**
     * @typedef {Object} ChangeEventHandler
     * @this {HTMLInputElement}
     */
    async function handleToggleAll() {
        const items = []
        for (let index = 0; index < numberOfFilteredItems; index++) {
            items.push($AllItems.data?.filteredItems?.edges[index].node?.id)
        }

        await toggleItems.mutate({ ids: items, completed: this.checked })
    }

    async function handleClearCompleted() {
        const items = []
        for (let index = 0; index < numberOfFilteredItems; index++) {
            items.push($AllItems.data?.filteredItems?.edges[index].node?.id)
        }

        deleteCompleteItems.mutate({ ids: items })
    }
</script>

<header class="header">
    <a href="/" class="todos">
        <h1>todos</h1>
    </a>
    <form name="todo">
        <input
            name="new-todo"
            class="new-todo"
            placeholder="What needs to be done?"
            bind:value={inputValue}
            bind:this={todoInput}
            on:blur={addInput}
            on:keyup={(event) => {
                if (event.key === 'Enter') {
                    addInput()
                }
            }}
        />
    </form>
</header>
{#if numberOfItems > 0}
    <section class="main">
        <input
            id="toggle-all"
            class="toggle-all"
            type="checkbox"
            on:change={handleToggleAll}
            checked={toggleAllChecked}
        />
        <label for="toggle-all">Mark all as complete</label>
        <ul class="todo-list">
            {#each $AllItems.data?.filteredItems.edges ?? [] as edge (edge.node?.id)}
                <ItemEntry {toggleAllChecked} data={edge.node} focusCallBack={todoInputFocus} />
            {/each}
        </ul>
    </section>
    <footer class="footer">
        <span data-testid="todo-count" class="todo-count"
            ><strong>{itemsLeft}</strong>
            {itemsLeft > 1 || itemsLeft === 0 ? 'items' : 'item'} left</span
        >
        <ul class="filters">
            <li>
                <a class:selected={$currentPage === 'all'} class="selected" href="/">All</a>
            </li>
            <li>
                <a class:selected={$currentPage === 'active'} href="/active">Active</a>
            </li>
            <li>
                <a class:selected={$currentPage === 'completed'} href="/completed">Completed</a>
            </li>
        </ul>
        {#if completedCount > 0}
            <button class="clear-completed" on:click={handleClearCompleted}>Clear completed</button>
        {/if}
    </footer>
{/if}

<style>
    .clear-completed {
        margin-top: -4px;
        padding: 3px;
    }
    .todos {
        width: 100%;
        padding: 40px 0;
        text-decoration: none;
        display: inline-block;
    }

    .todos h1 {
        position: initial;
        top: auto;
        padding: 0;
        margin: 0;
    }

    button {
        border: 1px solid darkgray;
        border-radius: 3px;
        padding: 4px;
        background: white;
        cursor: pointer;
    }

    button:active {
        background: #f6f6f6;
    }
</style>
