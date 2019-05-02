import { createError } from 'apollo-errors';
 
export const UserInputError = createError('UserInputError', {
  message: 'Wrong input'
});

export const Auth0Error = createError('Auth0Error', {
  message: 'Auth0 error'
});