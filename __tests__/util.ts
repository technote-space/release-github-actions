const fs = require('fs');
const path = require('path');

export const getConfigFixture = (fileName: string = 'config.yml') => ({
    type: 'file',
    encoding: 'base64',
    size: 5362,
    name: fileName,
    path: `.github/${fileName}`,
    content: encodeContent(fs.readFileSync(path.resolve(__dirname, `./fixtures/${fileName}`))),
    sha: '3d21ec53a331a6f037a91c368710b99387d012c1',
    url:
        'https://api.github.com/repos/Codertocat/Hello-World/contents/.github/release-drafter.yml',
    git_url:
        'https://api.github.com/repos/Codertocat/Hello-World/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
    html_url:
        'https://github.com/Codertocat/Hello-World/blob/master/.github/release-drafter.yml',
    download_url:
        'https://raw.githubusercontent.com/Codertocat/Hello-World/master/.github/release-drafter.yml',
    _links: {
        git:
            'https://api.github.com/repos/Codertocat/Hello-World/git/blobs/3d21ec53a331a6f037a91c368710b99387d012c1',
        self:
            'https://api.github.com/repos/Codertocat/Hello-World/contents/.github/release-drafter.yml',
        html:
            'https://github.com/Codertocat/Hello-World/blob/master/.github/release-drafter.yml',
    },
});

export const getApiFixture = (name: string) => JSON.parse(fs.readFileSync(path.resolve(__dirname, `./fixtures/${name}.json`)));

export const encodeContent = (content: string) => Buffer.from(content).toString('base64');
