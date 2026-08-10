import type { Config } from './time';
import rawConfig from '../config.json';

// JSON imports widen string literals; cast to the Config type for type safety.
export const config = rawConfig as Config;
