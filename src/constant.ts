import {Context} from '@actions/github/lib/context';
import {isValidContext} from './utils/misc';

export const DEFAULT_FETCH_DEPTH = 3;
export const TARGET_EVENTS       = {
  'create': [
    (context: Context): boolean => isValidContext(context),
  ],
  'release': [
    [
      'published',
      (context: Context): boolean => isValidContext(context),
    ],
  ],
  'push': [
    (context: Context): boolean => isValidContext(context),
  ],
};
