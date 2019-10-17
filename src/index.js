const {ApolloServer, AuthenticationError} = require('apollo-server')
const typeDefs = require('./typedefs')
const resolvers = require('./resolvers')
const {createToken, getUserFromToken} = require('./auth')
const db = require('./db')
const {FormatDateDirective} = require('./directives')

const port = process.env.APPPORT || 4000;

const server = new ApolloServer({
  typeDefs,
  resolvers,
  schemaDirectives: {
    formatDate: FormatDateDirective
  },
  context({req, connection}) {
    const ctx = {...db}
    if (connection) {
      return {...ctx, ...connection.context}
    }

    const token = req.headers.authorization
    const user = getUserFromToken(token)
    //console.log("user: ", user);

    return {...db, user, createToken}
  },
  subscriptions: {
    onConnect(connectionParams) {
      if (connectionParams.auth) {
        const user = getUserFromToken(connectionParams.auth)

        if (!user) {
          throw new AuthenticationError("Authenication Required")
        }
        return {user}
      }

      throw new AuthenticationError(`Authenication Required ${connectionParams.auth}`)
    }
  }
})

server.listen( {port: port }).then(({url, subscriptionsUrl}) => {
  console.log(`🚀 Server ready at ${url}`)
  console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`)
})
