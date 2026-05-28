export interface I18nText {
    english: string;
    russian: string;
    ukrainian: string;
    belarusian: string;
    french: string;
    
    get(): string;
}

export type I18nTextProto = new (
    english: string,
    russian: string,
    ukrainian: string,
    belarusian: string,
    french: string
) => I18nText;
