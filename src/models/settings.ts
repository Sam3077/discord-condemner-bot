import { isBoolean } from "util";

export default interface Settings {
    "initialized": boolean,
    "jail-role"?: string,
    "save-roles"?: string[],
    "arrest-photo"?: string,
    "free-photo"?: string,
    "max-time"?: number
}

interface DefinedSettings {
    "initialized": true,
    "jail-role": string,
    "save-roles": string[],
    "arrest-photo"?: string,
    "free-photo"?: string,
    "max-time": number
}

function isSettings(obj: any): obj is Settings {
    return isBoolean(obj.initialized);
}

function isDefinedSettings(obj: Settings): obj is DefinedSettings {
    return obj.initialized && obj['jail-role'] !== undefined && obj['save-roles'] !== undefined && obj['max-time'] !== undefined;
}

export {DefinedSettings, isDefinedSettings, isSettings};