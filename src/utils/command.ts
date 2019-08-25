import signale from 'signale';
import {spawn} from 'child_process';
import {Context} from '@actions/github/lib/context';
import {isGitCloned, getWorkspace, getGitUrl, getBuildCommands} from './misc';

export const clone = async (context: Context) => {
    if (isGitCloned()) return;
    const workspace = getWorkspace();
    const url = getGitUrl(context);
    await spawnAsync(`git -C ${workspace} clone --depth=1 --branch=master ${url} .`);
    await spawnAsync(`git -C ${workspace} checkout -qf ${context.sha}`);
};

export const runBuild = async () => {
    const commands = getBuildCommands();
    if (!commands.length) return;

    const workspace = getWorkspace();
    const current = process.cwd();
    signale.info('workspace=%s', workspace);
    signale.info('current=%s', current);
    await spawnAsync(`cd ${workspace}`);
    for (const command of commands) {
        await spawnAsync(command);
    }
    await spawnAsync(`cd ${current}`);
};

export const getDiffFiles = async () => {
    const workspace = getWorkspace();
    await spawnAsync(`git -C ${workspace} add --all`);
    await spawnAsync(`git -C ${workspace} status --short -uno`);
    return (await spawnAsync(`git -C ${workspace} status --short -uno`)).split(/\r\n|\n/).filter(line => line.match(/^[MDA]\s+/)).map(line => line.replace(/^[MDA]\s+/, ''));
};

const spawnAsync = (command: string) => new Promise<string>((resolve, reject) => {
    signale.info(`Run command: ${command}`);

    const process = spawn(command);
    let output = '';
    process.stdout.on('data', data => {
        console.log(data);
        output += data;
    });

    process.on('close', code => {
        if (code !== 0) reject(new Error(`command ${command} exited with code ${code}.`));
        resolve(output);
    });
});
