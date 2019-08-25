import signale from 'signale';
import {exec} from 'child_process';
import {Context} from '@actions/github/lib/context';
import {isGitCloned, getGitUrl, getBuildCommands, getCloneDepth, getWorkspace} from './misc';

export const clone = async (context: Context) => {
    if (isGitCloned()) return;
    const url = getGitUrl(context);
    const depth = getCloneDepth();
    const workspace = getWorkspace();
    await execAsync(`git -C ${workspace} clone --depth=${depth} ${url} .`);
    await execAsync(`git -C ${workspace} fetch origin ${context.ref}`);
    await execAsync(`git -C ${workspace} checkout -qf ${context.sha}`);
};

export const runBuild = async () => {
    const commands = getBuildCommands();
    if (!commands.length) return;

    for (const command of commands) {
        await execAsync(command);
    }
};

export const getDiffFiles = async () => {
    const workspace = getWorkspace();
    await execAsync(`git -C ${workspace} add --all --force`);
    signale.info(await execAsync(`git -C ${workspace} status --short -uno`));
    return (await execAsync(`git -C ${workspace} status --short -uno`)).split(/\r\n|\n/).filter(line => line.match(/^[MDA]\s+/)).map(line => line.replace(/^[MDA]\s+/, ''));
};

const execAsync = (command: string) => new Promise<string>((resolve, reject) => {
    signale.info(`Run command: ${command}`);

    exec(command, (error, stdout) => {
        if (error) reject(new Error(`command ${command} exited with code ${error}.`));
        resolve(stdout);
    });
});
