type LinksOrMeta = { [key: string]: any };
type LinksOrMetaOption = ((data: any, extraData?: any) => LinksOrMeta) | { [key: string]: any | ((data: any, extraData?: any) => any) };

interface RelationshipOptions {
    type: string | ((relationshipData: any, data: any) => string);
    alternativeKey?: string;
    schema?: string;
    links?: LinksOrMetaOption;
    meta?: LinksOrMetaOption;
    deserialize?: ((data: any) => any);
}

interface Options {
    id?: string;
    blacklist?: string[];
    whitelist?: string[];
    jsonapiObject?: boolean;
    links?: LinksOrMetaOption;
    topLevelLinks?: LinksOrMetaOption;
    topLevelMeta?: LinksOrMetaOption;
    meta?: LinksOrMetaOption;
    relationships?: {
        [x: string]: RelationshipOptions;
    };
    blacklistOnDeserialize?: string[];
    whitelistOnDeserialize?: string[];
    convertCase?: ('kebab-case' | 'snake_case' | 'camelCase');
    unconvertCase?: ('kebab-case' | 'snake_case' | 'camelCase');
    convertCaseCacheSize?: number;
    beforeSerialize?: ((data: any) => any);
    afterDeserialize?: ((data: any) => any);
}

interface DynamicTypeOptions {
    type: string | ((data: any) => string);
    jsonapiObject?: boolean;
    topLevelLinks?: LinksOrMetaOption;
    topLevelMeta?: LinksOrMetaOption;
}

type ErrorWithStatus = Error & { status?: string | number; statusCode?: string | number; code?: string | number; source?: { pointer?: string; parameter?: string }; meta?: { [key: string]: any } };

declare namespace JSONAPISerializer {
    export { RelationshipOptions, Options, ErrorWithStatus, DynamicTypeOptions };
}

declare class JSONAPISerializer {
    constructor(opts?: Options);
    register(type: string, options?: Options): void;
    register(type: string, schema?: string, options?: Options): void;
    serialize(type: string | DynamicTypeOptions, data: any, extraData?: any): any;
    serialize(type: string | DynamicTypeOptions, data: any, schema?: string, extraData?: any, excludeData?: boolean, overrideSchemaOptions?: { [type: string]: Partial<Options> }): any;
    serializeAsync(type: string | DynamicTypeOptions, data: any, extraData?: any): Promise<any>;
    serializeAsync(type: string | DynamicTypeOptions, data: any, schema?: string, extraData?: any, excludeData?: boolean, overrideSchemaOptions?: { [type: string]: Partial<Options> }): Promise<any>;
    deserialize(type: string | DynamicTypeOptions, data: any, schema?: string): any;
    deserializeAsync(type: string | DynamicTypeOptions, data: any, schema?: string): Promise<any>;
    serializeError(error: Error | Error[] | ErrorWithStatus | ErrorWithStatus[] | { [key: string]: any } | { [key: string]: any }[]): any;
}

export = JSONAPISerializer;