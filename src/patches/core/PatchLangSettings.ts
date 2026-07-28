import { LangSettings } from '@logic-arrows/lang/lang-settings';
import type { LangType } from '@logic-arrows/lang/lang-type';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../Patcher';

export const PatchLangSettings: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch(
        'LangSettings',
        (_module: typeof LangSettings) => {
            const oldSetLanguage = _module.setLanguage;
            _module.setLanguage = (lang: LangType) => {
                oldSetLanguage(lang);
                LangSettings.setLanguage(lang);
            };
            return _module;
        },
    );
};
