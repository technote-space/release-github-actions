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
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const signale_1 = __importDefault(require("signale"));
const command_1 = require("./utils/command");
// import {isTargetEvent} from './utils/misc';
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            signale_1.default.info(`Event: ${github_1.context.eventName}`);
            signale_1.default.info(`Action: ${github_1.context.action}`);
            // if (!isTargetEvent(context)) {
            //     signale.info('This is not target event.');
            //     return;
            // }
            // signale.info(`Tag name: ${context.payload.release.tag_name}`);
            // await deploy(context.payload.release.tag_name, context);
            yield command_1.deploy('test', github_1.context);
        }
        catch (error) {
            core_1.setFailed(error.message);
        }
    });
}
run();
