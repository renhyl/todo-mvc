import adapter from '@sveltejs/adapter-auto'
import sveltePreprocess from 'svelte-preprocess'

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: [sveltePreprocess()],
    kit: {
        adapter: adapter(),
        alias: {
            // these are the aliases and paths to them
            '~': './src',
            $houdini: './$houdini'
        }
    }
}

export default config
