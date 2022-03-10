/// <reference types="node" />
import { Readable } from 'stream';
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
declare function getVideoDurationInSeconds(input: string | Readable): Promise<number>;
export default getVideoDurationInSeconds;
export { getVideoDurationInSeconds };
