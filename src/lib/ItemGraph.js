import { graphql } from '$houdini'

// create the functions we'll invoke to check, uncheck, and delete the item

export const toggleItem = graphql`
    mutation ToggleItem($id: ID!, $completed: Boolean!) {
        toggleItem(item: $id, completed: $completed) {
            item {
                id
                completed
                ...Filtered_Items_remove @when(completed: $completed)
            }
        }
    }
`

export const toggleItems = graphql`
    mutation ToggleItems($ids: [ID!]!, $completed: Boolean!) {
        toggleItems(items: $ids, completed: $completed) {
            items {
                id
                completed
                ...Filtered_Items_remove @when(completed: $completed)
            }
        }
    }
`

export const deleteCompleteItems = graphql`
    mutation DeleteCompleteItems($ids: [ID!]!) {
        deleteCompleteItems(items: $ids) {
            items {
                id
            }
        }
    }
`

export const textChangeItem = graphql`
    mutation TextChangeItem($id: ID!, $text: String!) {
        changeTextItem(item: $id, text: $text) {
            item {
                id
                text
                ...Filtered_Items_remove @when(completed: false)
            }
        }
    }
`

export const deleteItem = graphql`
    mutation DeleteItem($id: ID!) {
        deleteItem(item: $id) {
            item {
                id
            }
        }
    }
`

// make sure the todo item stays up to date
export const itemUpdateSubscription = graphql`
    subscription ItemUpdate {
        itemUpdate {
            item {
                completed
                text
            }
        }
    }
`

export const toggleAllSubscription = graphql`
    subscription ToggleAll {
        toggleAll {
            items {
                completed
            }
        }
    }
`

export const newItemSubscription = graphql`
    subscription NewItem {
        newItem {
            item {
                ...All_Items_insert
                ...Filtered_Items_insert @prepend(when_not: { completed: true })
            }
        }
    }
`

export const deletedItemSubscription = graphql`
    subscription ItemDel {
        itemDel {
            item {
                ...All_Items_remove
                ...Filtered_Items_remove
            }
        }
    }
`

export const deletedCompleteItemsSubscription = graphql`
    subscription ItemsDel {
        itemsDel {
            items {
                ...All_Items_remove
                ...Filtered_Items_remove
            }
        }
    }
`

// state and handler for the new item input
export const addItem = graphql`
    mutation AddItem($input: AddItemInput!) {
        addItem(input: $input) {
            error {
                message
            }
        }
    }
`
