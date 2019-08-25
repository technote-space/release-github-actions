"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const signale_1 = __importDefault(require("signale"));
const child_process_1 = require("child_process");
const misc_1 = require("./misc");
exports.clone = (context) => __awaiter(this, void 0, void 0, function* () {
    if (misc_1.isGitCloned())
        return;
    const url = misc_1.getGitUrl(context);
    const depth = misc_1.getCloneDepth();
    const workspace = misc_1.getWorkspace();
    yield execAsync(`git -C ${workspace} clone --depth=${depth} ${url} .`);
    yield execAsync(`git -C ${workspace} fetch origin ${context.ref}`);
    yield execAsync(`git -C ${workspace} checkout -qf ${context.sha}`);
});
exports.runBuild = () => __awaiter(this, void 0, void 0, function* () {
    const commands = misc_1.getBuildCommands();
    if (!commands.length)
        return;
    for (const command of commands) {
        yield execAsync(command);
    }
});
exports.getDiffFiles = () => __awaiter(this, void 0, void 0, function* () {
    const workspace = misc_1.getWorkspace();
    yield execAsync(`git -C ${workspace} add --all --force`);
    signale_1.default.info(yield execAsync(`git -C ${workspace} status --short -uno`));
    return (yield execAsync(`git -C ${workspace} status --short -uno`)).split(/\r\n|\n/).filter(line => line.match(/^[MDA]\s+/)).map(line => line.replace(/^[MDA]\s+/, ''));
});
const execAsync = (command) => new Promise((resolve, reject) => {
    signale_1.default.info(`Run command: ${command}`);
    child_process_1.exec(command, (error, stdout) => {
        if (error)
            reject(new Error(`command ${command} exited with code ${error}.`));
        resolve(stdout);
    });
});
