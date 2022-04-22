import { expect, it } from 'vitest';
import { Command, Misc, Types } from '.';

it('helpers can be imported', () => {
  expect(Misc).not.toBeFalsy();
  expect(Command).not.toBeFalsy();
  expect(Types).not.toBeFalsy();
});
