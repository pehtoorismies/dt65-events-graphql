import { prisma } from './generated/prisma-client';
import datamodelInfo from './generated/nexus-prisma';
import { formatError, GraphQLError } from 'graphql';
import * as path from 'path';
import {
  UserInputError,
  ApolloError,
  ValidationError,
  formatApolloErrors,
} from 'apollo-server-core';
import { stringArg, idArg } from 'nexus';
import { prismaObjectType, makePrismaSchema } from 'nexus-prisma';
import { GraphQLServer } from 'graphql-yoga';
import { config } from './config';
import { createAuthZeroUser } from './auth-zero';

const Query = prismaObjectType({
  name: 'Query',
  definition(t) {
    t.prismaFields(['users']);
    t.prismaFields(['events']);
    // t.list.field('feed', {
    //   type: 'Post',
    //   resolve: (_, args, ctx) => ctx.prisma.posts({ where: { published: true } })
    // })
    // t.list.field('postsByUser', {
    //   type: 'Post',
    //   args: { email: stringArg() },
    //   resolve: (_, { email }, ctx) => ctx.prisma.posts({ where: { author: { email } } })
    // })
  },
});

const argIsRequired = { required: true };

const Mutation = prismaObjectType({
  name: 'Mutation',

  definition(t) {
    // t.prismaFields(['createUser']);
    t.field('register', {
      type: 'User',
      args: {
        email: stringArg(argIsRequired),
        username: stringArg(argIsRequired),
        password: stringArg(argIsRequired),
        name: stringArg(argIsRequired),
        registerSecret: stringArg(argIsRequired),
      },
      resolve: async (
        _,
        { email, username, password, name, registerSecret },
        ctx,
      ) => {
        if (config.registerSecret !== registerSecret) {
          return new UserInputError('Wrongi register secret', {
            invalidArgs: ['secret'],
          });
        }
        const auth0User = await createAuthZeroUser(email, username, password);
        if (!auth0User) {
          return new ApolloError('Auth0 error');
        }
        const { user_id: auth0Id } = auth0User;

        return ctx.prisma.createUser({
          name,
          username,
          email,
          auth0Id,
        });
      },
    }),
      t.field('joinEvent', {
        type: 'Event',
        args: {
          eventId: idArg(),
          username: stringArg(),
        },
        resolve: (_, { eventId, username }, ctx) =>
          ctx.prisma.updateEvent({
            where: { id: eventId },
            data: {
              participants: {
                connect: { username },
              },
            },
          }),
      });
    // get username from jwt
    t.field('unjoinEvent', {
      type: 'Event',
      args: {
        eventId: idArg(),
        username: stringArg(),
      },
      resolve: (_, { eventId, username }, ctx) =>
        ctx.prisma.updateEvent({
          where: { id: eventId },
          data: {
            participants: {
              disconnect: { username },
            },
          },
        }),
    });
  },
});

const schema = makePrismaSchema({
  types: [Mutation, Query],

  prisma: {
    datamodelInfo,
    client: prisma,
  },

  outputs: {
    schema: path.join(__dirname, './generated/schema.graphql'),
    typegen: path.join(__dirname, './generated/nexus.ts'),
  },
});

// const autheticate = async (resolve, root, args, context, info) => {
//   console.log('***');
//   console.log(info.fieldName);
//   console.log(info.operation);
//   console.log('/***');
//   let token;
//   try {
//     token = jwt.verify(context.request.get('Authorization'), 'secret');
//   } catch (e) {
//     return new AuthenticationError('Not authorised');
//   }
//   const result = await resolve(root, args, context, info);
//   return result;
// };

const server = new GraphQLServer({
  schema,
  context: req => ({ ...req, prisma }),
  // middlewares: [autheticate],
});

// server.express.use((req, res, next) => {
//   console.log(req)
//   const { authorization } = req.headers;
//   jwt.verify(authorization, 'secret', (err: Error, decodedToken: string) => {
//     console.log(err);
//     console.log(decodedToken);
//     if (err || !decodedToken) {
//       res.status(401).send('not authorized');
//       return;
//     }
//     next();
//   });
// });

const options = {
  port: 4000,
  endpoint: '/graphql',
  subscriptions: '/subscriptions',
  playground: '/playground',
  formatError: (err: GraphQLError) => formatApolloErrors([err]),
};

server.start(options, ({ port }) =>
  console.log(
    `Server started, listening on port ${port} for incoming requests.`,
  ),
);

// server.start(() => console.log('Server is running on http://localhost:4000'));
