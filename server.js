const { ApolloServer, 
        PubSub,
        SchemaDirectiveVisitor
} = require('apollo-server')
const gql = require('graphql-tag') 
const {defaultFieldResolver, GraphQLString} = require('graphql')

const pubsub = new PubSub()
const NEW_ITEM = 'NEW_ITEM'

class LogDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field) {
        const resolver = field.resolve || defaultFieldResolver
        const {message} = this.args
        field.args.push({
            type: GraphQLString,
            name: 'message'
        })
        field.resolve = (root, {message, ...rest}, ctx, info) => {
            console.log(`🌲 logging ${message}`)
            return resolver.apply(this, args)
            return resolver.call(this, root, rest, ctx, info)
        }
    }
}


const typeDefs = gql`
    directive @log(message: String = "default message") on FIELD_DEFINITION


    type User {
        id: ID! @log(message: "IDIDID")
        username: String! @deprecated(reason: "I don't like it")
        createdAt: String!
    }

    type Item {
        task: String!
        createdAt: String
    }

    type Settings {
        user: User!
        theme: String!
    }

    input NewSettingsInput {
        user: ID!
        theme: String!
    }

    type Query {
        me: User!
        settings(user: ID!): Settings!
    }

    type Mutation {
        settings(input: NewSettingsInput!): Settings!
        newItem(task: String): Item!
    }

    type Subscription {
        newItem: Item
    }

`

const items = []

const resolvers = { 
    Query: {
        me() {
            return {
                id: '234112',
                createdAt: '1918181',
                username: 'Mark'
            }
        },
        settings(_, {userId}, context) {
            return {
                userId,
                theme: 'light'
            }
        }
    },
    Mutation: {
        settings(_, {input} ) {
            return {
                user: input.id,
                theme: input.theme

            }
        },
        newItem(_, {task}) {
            const created = Date()
            const item = {task: task, createdAt: created}
            items.push(item)
            pubsub.publish(NEW_ITEM, {newItem: item})
            return item
        }
    },
    Subscription: {
        newItem: {
            subscribe: () => pubsub.asyncIterator(NEW_ITEM)
        }
    }

}


const server = new ApolloServer({
    typeDefs,
    resolvers,
    schemaDirectives: {
        log: LogDirective
    },
    context({connection}) {
        if (connection) {
            return {...connection.context}
        }
        return {}
    },
    subscriptions: {
        onConnect(connectionParams) {

        }
    }
})

server.listen().then(({url}) => 
    console.log(`server at ${url}`)
)