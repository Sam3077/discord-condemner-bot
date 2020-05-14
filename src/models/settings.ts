import { isBoolean } from "util";

export default interface Settings {
    "initialized": boolean,
    "jail-role"?: string,
    "save-roles"?: string[],
    "arrest-photo"?: string,
    "free-photo"?: string
}

interface DefinedSettings {
    "initialized": true,
    "jail-role": string,
    "save-roles": string[],
    "arrest-photo"?: string,
    "free-photo"?: string
}

function isSettings(obj: any): obj is Settings {
    return isBoolean(obj.initialized);
}

function isDefinedSettings(obj: Settings): obj is DefinedSettings {
    return obj.initialized && obj['jail-role'] !== undefined && obj['save-roles'] !== undefined;
}

export {DefinedSettings, isDefinedSettings, isSettings};