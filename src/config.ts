import rawConfig from '../config.json';
import type { Config } from './time';

// JSON imports widen string literals; cast to the Config type for type safety.
export const config = rawConfig as Config;
