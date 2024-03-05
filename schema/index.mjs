import { GraphQLScalarType, Kind } from 'graphql'
import gql from 'graphql-tag'
import { createPubSub } from 'graphql-yoga'

const pubSub = createPubSub()

export const typeDefs = gql`
    scalar DateTime

    type Error {
        message: String!
        code: String!
    }

    type TodoItem {
        id: ID!
        text: String!
        completed: Boolean!
        createdAt: DateTime!
    }

    type Query {
        items(
            first: Int
            after: String
            completed: Boolean
            createdAt: DateTime
            orderBy: ItemOrderByInput
        ): TodoItemConnection!
    }

    type Mutation {
        addItem(input: AddItemInput!): AddItemOutput!
        deleteItem(item: ID!): DeleteItemOutput!
        changeTextItem(item: ID!, text: String!): UpdateItemOutput!
        toggleItem(item: ID!, completed: Boolean!): UpdateItemOutput!
        toggleItems(items: [ID!]!, completed: Boolean!): UpdateItemsOutput!
        deleteCompleteItems(items: [ID!]!): UpdateItemsOutput!
    }

    type Subscription {
        itemUpdate: ItemUpdate!
        newItem: ItemUpdate!
        itemDel: ItemUpdate!
        itemsDel: UpdateItemsOutput!
        toggleAll: UpdateItemsOutput!
    }

    input AddItemInput {
        text: String!
    }

    type AddItemOutput {
        error: Error
        item: TodoItem
    }

    type UpdateItemOutput {
        error: Error
        item: TodoItem
    }

    type UpdateItemsOutput {
        error: Error
        items: [TodoItem]
    }

    type DeleteItemOutput {
        error: Error
        item: TodoItem
    }

    type ItemUpdate {
        item: TodoItem!
    }

    type PageInfo {
        startCursor: String
        endCursor: String
        hasNextPage: Boolean!
        hasPreviousPage: Boolean!
    }

    type TodoItemConnection {
        totalCount: Int!
        pageInfo: PageInfo!
        edges: [TodoItemEdge!]!
    }

    type TodoItemEdge {
        cursor: String
        node: TodoItem
    }

    input ItemOrderByInput {
        id: Sort
        text: Sort
        createdAt: Sort
    }

    enum Sort {
        asc
        desc
    }
`

// example data
let items = []
let id = items.length

/**
 * @param {Array} targetItems collectiion of items
 * @param {String} orderBy desc | asc
 * @returns {Array} ordered collection of items
 */
function orderByComparator(targetItems, orderBy) {
    if (Object.entries(orderBy).length > 1) {
        throw new Error('Only one orderBy field at the time is supported')
    }

    const [field, value] = Object.entries(orderBy)[0]

    return targetItems.sort((a, b) => {
        if (value === 'asc') {
            return a[field] - b[field]
        } else {
            return b[field] - a[field]
        }
    })
}

export const resolvers = {
    Query: {
        items: (_, { completed, after, first, orderBy }, context) => {
            console.log(context)
            // apply the filter
            const filtered = items.filter((item) => {
                return typeof completed === 'boolean'
                    ? Boolean(item.completed) === Boolean(completed)
                    : true
            })

            let targetItems = [...filtered]

            if (orderBy) {
                targetItems = orderByComparator(targetItems, orderBy)
            }

            // if we have an after to apply, do it
            let skipped = 0
            let head = null
            if (after) {
                while (targetItems.length > 0 && (!head || head.id !== after)) {
                    head = targetItems.shift()
                    skipped++
                }
            }

            // if we have a first to apply
            if (typeof first !== 'undefined') {
                targetItems = targetItems.slice(0, first)
            }

            const connection = {
                totalCount: filtered.length,
                pageInfo: {
                    startCursor: targetItems[0]?.id,
                    endCursor: targetItems[targetItems.length - 1]?.id,
                    hasNextPage: targetItems.length + skipped < filtered.length,
                    hasPreviousPage: skipped > 0
                },
                edges: targetItems.map((item) => ({
                    cursor: item.id,
                    node: item
                }))
            }

            return connection
        }
    },
    Mutation: {
        toggleItem(_, { item: targetID, completed }) {
            // grab the item in question
            const item = items.find(({ id }) => id === targetID)
            if (!item) {
                throw new Error('Could not find item')
            }

            // update the completed value
            item.completed = completed

            // notify any subscribers
            pubSub.publish('ITEM_UPDATE', { item })

            return {
                error: null,
                item
            }
        },
        /**
         * @typedef {Object} TodoItem
         * @property {String} id
         * @property {Boolean} completed
         */
        /**
         * @typedef {Object} TargetItems
         * @property {TodoItem[]} items
         * @property {Boolean} completed
         */
        /**
         *
         * @param {any} _
         * @param {TargetItems} {}
         * @returns {Array}
         */
        toggleItems(_, { items: targetItemIds, completed }) {
            const newItems = targetItemIds.map((targetID) => {
                const item = items.find(({ id }) => id === targetID)
                if (!item) return

                item.completed = completed

                return item
            })

            if (newItems.length <= 0) {
                throw new Error('Could not find any items')
            }

            // notify any subscribers
            pubSub.publish('ITEMS_TOGGLE_ALL', { items: newItems })

            return {
                error: null,
                items: newItems
            }
        },
        deleteCompleteItems(_, { items: targetItemIds }) {
            let deletedItems = []
            // filter out the item with the matching id
            targetItemIds.map((targetItemId) => {
                let item = items.find(({ id }) => id === targetItemId)
                if (!item) return

                if (!item.completed) return

                deletedItems.push(item)
                // filter out the item with the matching id
                items = items.filter((i) => i.id !== targetItemId)
            })

            // notify any subscribers
            pubSub.publish('ITEMS_DELETE', { items: deletedItems })

            return {
                error: null,
                items: deletedItems
            }
        },
        changeTextItem(_, { item: targetID, text }) {
            // grab the item in question
            const item = items.find(({ id }) => id === targetID)

            // update the text value
            item.text = text

            // notify any subscribers
            pubSub.publish('ITEM_UPDATE', { item })

            return {
                error: null,
                item
            }
        },
        deleteItem(_, { item: targetID }) {
            let item = items.find(({ id }) => id === targetID)
            // filter out the item with the matching id
            items = items.filter((i) => i.id !== targetID)

            // notify any subscribers
            pubSub.publish('ITEM_DELETE', { item })

            return {
                item,
                error: null
            }
        },
        addItem(_, { input: { text } }) {
            const item = {
                text,
                completed: false,
                id: (parseInt(id, 10) + 1).toString(),
                createdAt: new Date()
            }
            id++

            // add the item to the end of the list even though the UI adds it to the top
            // in order to simulate filling in an item in a connection that was
            // added as part of a mutation operation but later found in the same list
            // while paginating
            items.push(item)

            // notify any subscribers
            pubSub.publish('NEW_ITEM', { item })

            return { item, error: null }
        }
    },
    TodoItem: {
        completed: ({ completed }) => Boolean(completed)
    },
    Subscription: {
        itemUpdate: {
            subscribe: () => {
                return pubSub.subscribe('ITEM_UPDATE')
            },
            resolve: (payload) => {
                return payload
            }
        },
        newItem: {
            subscribe: () => {
                return pubSub.subscribe('NEW_ITEM')
            },
            resolve: (payload) => {
                return payload
            }
        },
        itemDel: {
            subscribe: () => {
                return pubSub.subscribe('ITEM_DELETE')
            },
            resolve: (payload) => {
                return payload
            }
        },
        itemsDel: {
            subscribe: () => {
                return pubSub.subscribe('ITEMS_DELETE')
            },
            resolve: (payload) => {
                return payload
            }
        },
        toggleAll: {
            subscribe: () => {
                return pubSub.subscribe('ITEMS_TOGGLE_ALL')
            },
            resolve: (payload) => {
                return payload
            }
        }
    },
    DateTime: new GraphQLScalarType({
        name: 'DateTime',
        description: 'Date custom scalar type',
        serialize(value) {
            return value.getTime()
        },
        parseValue(value) {
            return new Date(value)
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.INT) {
                return new Date(parseInt(ast.value, 10))
            }

            return null
        }
    })
}
