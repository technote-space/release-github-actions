import signale from 'signale';
import {exec} from 'child_process';
import {Context} from '@actions/github/lib/context';
import {isGitCloned, getGitUrl, getBuildCommands, getCloneDepth} from './misc';

export const clone = async (context: Context) => {
    if (isGitCloned(context)) return;
    const url = getGitUrl(context);
    const depth = getCloneDepth();
    await execAsync(`git -C ${context.workflow} clone --depth=${depth} --branch=master ${url} .`);
    await execAsync(`git -C ${context.workflow} checkout -qf ${context.sha}`);
};

export const runBuild = async (context: Context) => {
    const commands = getBuildCommands();
    if (!commands.length) return;

    const current = process.cwd();
    signale.info('context.workflow=%s', context.workflow);
    signale.info('current=%s', current);
    await execAsync(`cd ${context.workflow}`);
    for (const command of commands) {
        await execAsync(command);
    }
    await execAsync(`cd ${current}`);
};

export const getDiffFiles = async (context: Context) => {
    await execAsync(`git -C ${context.workflow} add --all`);
    await execAsync(`git -C ${context.workflow} status --short -uno`);
    return (await execAsync(`git -C ${context.workflow} status --short -uno`)).split(/\r\n|\n/).filter(line => line.match(/^[MDA]\s+/)).map(line => line.replace(/^[MDA]\s+/, ''));
};

const execAsync = (command: string) => new Promise<string>((resolve, reject) => {
    signale.info(`Run command: ${command}`);

    exec(command, (error, stdout) => {
        if (error) reject(new Error(`command ${command} exited with code ${error}.`));
        resolve(stdout);
    });
});
