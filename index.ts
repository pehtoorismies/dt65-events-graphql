import { prisma } from './generated/prisma-client';
import datamodelInfo from './generated/nexus-prisma';
import * as R from 'ramda';
import { formatError } from 'apollo-errors';
import * as path from 'path';
import { stringArg, idArg, objectType } from 'nexus';
import { prismaObjectType, makePrismaSchema } from 'nexus-prisma';
import { GraphQLServer } from 'graphql-yoga';
import { UserInputError, Auth0Error, AuthorizationError } from './errors';
import { config } from './config';
import { createAuthZeroUser, loginAuthZeroUser } from './auth-zero';
import { permissions, requestScopes } from './middleware';

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

const AuthUser = objectType({
  name: 'AuthUser',
  definition(t) {
    t.string('idToken');
    t.string('accessToken');
    t.int('expiresIn');
  },
});

const Mutation = prismaObjectType({
  name: 'Mutation',

  definition(t) {
    t.prismaFields(['createEvent']);
    t.field('login', {
      type: 'AuthUser',
      args: {
        username: stringArg(argIsRequired),
        password: stringArg(argIsRequired),
      },
      resolve: async (_, { username, password }, ctx) => {
        try {
          const authZeroUser = await loginAuthZeroUser(username, password);
          return authZeroUser;
        } catch (error) {
          console.log(error);
          return new Auth0Error();
        }
      },
    }),
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
            return new UserInputError({
              data: {
                registerSecret: 'Väärä rekisteröintikoodi',
              },
            });
          }
          const auth0User = await createAuthZeroUser(email, username, password);
          if (!auth0User) {
            return new Auth0Error();
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
        resolve: (_, { eventId, username }, ctx) => {
          return ctx.prisma.updateEvent({
            where: { id: eventId },
            data: {
              participants: {
                connect: { username },
              },
            },
          });
        },
      });
    // get username from jwt
    t.field('unjoinEvent', {
      type: 'Event',
      args: {
        eventId: idArg(),
        username: stringArg(),
      },
      resolve: (_, { eventId, username }, ctx) => {
        return ctx.prisma.updateEvent({
          where: { id: eventId },
          data: {
            participants: {
              disconnect: { username },
            },
          },
        });
      },
    });
  },
});

const schema = makePrismaSchema({
  types: [Mutation, Query, AuthUser],

  prisma: {
    datamodelInfo,
    client: prisma,
  },

  outputs: {
    schema: path.join(__dirname, './generated/schema.graphql'),
    typegen: path.join(__dirname, './generated/nexus.ts'),
  },
});

const server = new GraphQLServer({
  schema,
  context: req => ({ ...req, prisma }),
  middlewares: [requestScopes, permissions],
});

const options = {
  port: 4000,
  endpoint: '/graphql',
  subscriptions: '/subscriptions',
  playground: '/playground',
  formatError,
};

server.start(options, ({ port }) =>
  console.log(
    `Server started, listening on port ${port} for incoming requests.`,
  ),
);
