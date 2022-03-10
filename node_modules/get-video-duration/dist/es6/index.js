"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVideoDurationInSeconds = void 0;
/// <reference types="./ffprobe" />
const node_ffprobe_installer_1 = require("node-ffprobe-installer");
const execa = require("execa");
const isStream = require("is-stream");
function getFFprobeWrappedExecution(input) {
    const params = ['-v', 'error', '-show_format', '-show_streams'];
    if (typeof input === 'string') {
        return execa(node_ffprobe_installer_1.path, [...params, input]);
    }
    if (isStream(input)) {
        return execa(node_ffprobe_installer_1.path, [...params, '-i', 'pipe:0'], {
            reject: false,
            input,
        });
    }
    throw new Error('Given input was neither a string nor a Stream');
}
/**
 * Returns a promise that will be resolved with the duration of given video in
 * seconds.
 *
 * @param  {Stream|String} input Stream or URL or path to file to be used as
 * input for `ffprobe`.
 *
 * @return {Promise} Promise that will be resolved with given video duration in
 * seconds.
 */
function getVideoDurationInSeconds(input) {
    return __awaiter(this, void 0, void 0, function* () {
        const { stdout } = yield getFFprobeWrappedExecution(input);
        const matched = stdout.match(/duration="?(\d*\.\d*)"?/);
        if (matched && matched[1])
            return parseFloat(matched[1]);
        throw new Error('No duration found!');
    });
}
exports.getVideoDurationInSeconds = getVideoDurationInSeconds;
exports.default = getVideoDurationInSeconds;
//# sourceMappingURL=index.js.map