/* eslint-disable no-magic-numbers */
import {resolve} from 'path';
import nock from 'nock';
import {Context} from '@actions/github/lib/context';
import {Octokit} from '@technote-space/github-action-helper/dist/types';
import {Logger} from '@technote-space/github-action-log-helper';
import {
  getContext,
  testEnv,
  disableNetConnect,
  getApiFixture,
  spyOnSpawn,
  testChildProcess,
  testFs,
  setChildProcessParams,
  getOctokit,
} from '@technote-space/github-action-test-helper';
import {getParams} from '../../src/utils/misc';
import {
  updateRelease,
  deploy,
} from '../../src/utils/command';
import {ReposListReleasesResponseItem} from '../../src/types';

const rootDir = resolve(__dirname, '../..');
const common  = async(callback: (fn1, fn2, mockExec) => void, method: (GitHub, Context) => Promise<void>, tagName = 'v1.2.3'): Promise<void> => {
  const mockExec = spyOnSpawn();
  const fn1      = jest.fn();
  const fn2      = jest.fn();
  nock('https://api.github.com')
    .get('/repos/Hello/World/releases')
    .reply(200, () => {
      fn1();
      return getApiFixture(resolve(__dirname, '..', 'fixtures'), 'repos.listReleases');
    })
    .patch('/repos/Hello/World/releases/1', body => {
      expect(body).toEqual({draft: false});
      return body;
    })
    .reply(200, () => {
      fn2();
      return getApiFixture(resolve(__dirname, '..', 'fixtures'), 'repos.updateRelease');
    });

  await method(getOctokit(), getContext({
    eventName: 'push',
    repo: {
      owner: 'Hello',
      repo: 'World',
    },
    ref: `refs/tags/${tagName}`,
    sha: 'test-sha',
  }));

  callback(fn1, fn2, mockExec);
};
const logger  = new Logger();

beforeEach(() => {
  getParams.clear();
  Logger.resetForTesting();
});

describe('updateRelease', () => {
  testEnv(rootDir);
  disableNetConnect(nock);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getReleaseItem = (override: { [key: string]: any }): ReposListReleasesResponseItem => Object.assign({
    url: '',
    'html_url': '',
    'assets_url': '',
    'upload_url': '',
    'tarball_url': '',
    'zipball_url': '',
    id: 1,
    'node_id': '',
    'tag_name': '',
    'target_commitish': '',
    name: '',
    body: '',
    draft: false,
    prerelease: false,
    'created_at': '',
    'published_at': '',
    author: {
      login: '',
      id: 1,
      'node_id': '',
      'avatar_url': '',
      'gravatar_id': '',
      url: '',
      'html_url': '',
      'followers_url': '',
      'following_url': '',
      'gists_url': '',
      'starred_url': '',
      'subscriptions_url': '',
      'organizations_url': '',
      'repos_url': '',
      'events_url': '',
      'received_events_url': '',
      type: '',
      'site_admin': false,
    },
    assets: [],
  }, override);

  it('should do nothing 1', async() => {
    await common((fn1, fn2) => {
      expect(fn1).not.toBeCalled();
      expect(fn2).not.toBeCalled();
    }, async(octokit: Octokit, context: Context) => {
      await updateRelease(undefined, logger, octokit, context);
    });
  });

  it('should do nothing 2', async() => {
    await common((fn1, fn2) => {
      expect(fn1).not.toBeCalled();
      expect(fn2).not.toBeCalled();
    }, async(octokit: Octokit, context: Context) => {
      await updateRelease(getReleaseItem({draft: true}), logger, octokit, context);
    });
  });

  it('should update release', async() => {
    await common((fn1, fn2) => {
      expect(fn1).not.toBeCalled();
      expect(fn2).toBeCalledTimes(1);
    }, async(octokit: Octokit, context: Context) => {
      await updateRelease(getReleaseItem({}), logger, octokit, context);
    });
  });
});

describe('deploy', () => {
  disableNetConnect(nock);
  testEnv(rootDir);
  testChildProcess();
  testFs();

  it('should commit', async() => {
    process.env.INPUT_GITHUB_TOKEN = 'test-token';
    setChildProcessParams({stdout: 'A test.txt'});

    await common((fn1, fn2, mockExec) => {
      expect(mockExec).toBeCalled();
      expect(fn1).toBeCalledTimes(1);
      expect(fn2).toBeCalledTimes(1);
    }, deploy);
  });
});
