import { loadSchema } from '@graphql-tools/load'
import { createYoga } from 'graphql-yoga'
import { resolvers } from './schema/index.mjs'
import { makeHandler } from 'graphql-ws/lib/use/bun'
import { addResolversToSchema } from '@graphql-tools/schema'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import chalk from 'chalk'

async function main() {
    // Load schema from the file
    const schema = await loadSchema('./schema/schema.graphql', {
        // load from a single schema file
        loaders: [new GraphQLFileLoader()]
    })

    // Add resolvers to the schema
    const schemaWithResolvers = addResolversToSchema({ schema, resolvers })
    const signingKey = process.env.JWT_SECRET
    const yogaApp = createYoga({
        logging: 'error',
        schema: schemaWithResolvers,
        graphiql: {
            // Use WebSockets in GraphiQL
            subscriptionsProtocol: 'WS'
        }
    })

    const websocketHandler = makeHandler({
        schema,
        execute: (args) => args.rootValue.execute(args),
        subscribe: (args) => args.rootValue.subscribe(args),
        onSubscribe: async (ctx, msg) => {
            const { schema, execute, subscribe, contextFactory, parse, validate } =
                yogaApp.getEnveloped({
                    ...ctx,
                    req: ctx.extra.request,
                    socket: ctx.extra.socket,
                    params: msg.payload
                })

            const args = {
                schema,
                operationName: msg.payload.operationName,
                document: parse(msg.payload.query),
                variableValues: msg.payload.variables,
                contextValue: await contextFactory(),
                rootValue: {
                    execute,
                    subscribe
                }
            }

            const errors = validate(args.schema, args.document)
            if (errors.length) return errors

            return args
        }
    })

    const server = Bun.serve({
        fetch: (request, server) => {
            // Upgrade the request to a WebSocket
            if (server.upgrade(request)) {
                return new Response()
            }

            return yogaApp.fetch(request, server)
        },
        port: 4000,
        websocket: websocketHandler
    })

    // Listen for Ctrl-C, when pressed exit process
    // avoids script hanging in the background when running multiple bun run a & bun run b
    // ie http server port 4000
    process.on('SIGINT', () => {
        console.log(
            chalk.red('🔴 - Shutting down 🤖 API - ') +
                chalk.blue('GraphQL') +
                ' ' +
                chalk.magenta('Yoga 🎉') +
                chalk.red(' - 🔴')
        )
        process.exit()
    })

    console.table({
        [chalk.blue('GraphQL') + ' ' + chalk.magenta('Yoga 🎉')]: {
            [chalk.green('🤖 Server is running on:')]: `${new URL(
                'http://localhost:4000/graphql',
                `http://${server.hostname}:${server.port}`
            )}`
        }
    })
}

main().catch((e) => {
    console.error(e)
    process.exit(1) // 1 indicates error
})
