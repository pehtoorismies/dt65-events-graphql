import { prisma } from './generated/prisma-client';
import datamodelInfo from './generated/nexus-prisma';
import * as path from 'path';
import * as jwt from 'jsonwebtoken';
import { AuthenticationError } from 'apollo-server-core';
import { stringArg, idArg } from 'nexus';
import { prismaObjectType, makePrismaSchema } from 'nexus-prisma';
import { GraphQLServer } from 'graphql-yoga';

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

const Mutation = prismaObjectType({
  name: 'Mutation',
  definition(t) {
    t.prismaFields(['createUser']);
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

server.start(() => console.log('Server is running on http://localhost:4000'));
