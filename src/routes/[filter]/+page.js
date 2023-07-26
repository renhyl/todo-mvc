import { graphql } from '$houdini'
import { error } from '@sveltejs/kit'

export const _houdini_load = graphql`
    query AllItems($completed: Boolean) @cache(policy: CacheOrNetwork) {
        filteredItems: items(completed: $completed, orderBy: { createdAt: desc })
            @list(name: "Filtered_Items") {
            edges {
                node {
                    id
                    text
                    completed
                    ...ItemEntry_item
                }
            }
        }
        allItems: items @list(name: "All_Items") {
            edges {
                node {
                    id
                    text
                    completed
                }
            }
        }
    }
`

/**
 *
 * @param {*} params
 * @returns { Object & { completed: Boolean|undefined }}}
 */
export function _AllItemsVariables({ params }) {
    // if there is no filter assigned, dont enforce one in the query
    if (!params.filter || params.filter === 'all') {
        return {
            completed: undefined
        }
    }

    // make sure we recognize the value
    if (!['active', 'completed', 'all'].includes(params.filter)) {
        throw error(400, "filter must be one of 'active' or 'completed'")
    }

    return {
        completed: params.filter === 'completed'
    }
}
