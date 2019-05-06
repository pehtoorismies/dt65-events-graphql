import { rule, shield } from 'graphql-shield';
import * as R from 'ramda';
import * as RA from 'ramda-adjunct';

interface Context {
  scopes?: string[];
}

export const verifyRole = (role: string, context: Context): boolean => {
  const scopes = context.scopes || [];
  if (RA.isNilOrEmpty(role)) {
    return true;
  }
  return R.findIndex(R.equals(role))(scopes) >= 0;
};

const rules = {
  isUserReader: rule()((parent, args, context) => {
    return verifyRole('read:users', context);
  }),
  isEventReader: rule()(async (parent, { id }, context) => {
    return verifyRole('read:events', context);
  }),
  isEventWriter: rule()(async (parent, { id }, context) => {
    return verifyRole('write:events', context);
  }),
};

const permissions = shield({
  Query: {
    users: rules.isUserReader,
    events: rules.isEventReader,
  },
  Mutation: {
    createEvent: rules.isEventWriter,
    deleteEvent: rules.isEventWriter,
    updateEvent: rules.isEventWriter,
    joinEvent: rules.isEventWriter,
    unjoinEvent: rules.isEventWriter,
  },
});
export default permissions;
