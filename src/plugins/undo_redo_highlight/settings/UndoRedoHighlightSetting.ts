import { I18nText } from '@logic-arrows/lang/i18n-text';
import { OtherSettingGroup } from 'src/core/settings/groups/OtherGroup';
import { SelectSetting } from 'src/core/settings/types/SelectSetting';

export const enum UndoRedoHighlightMode {
    OFF = 0,
    ON = 1,
    ON_ZOOM = 2,
}

const NameLocale = new I18nText(
    'Undo/Redo Highlight',
    'Подсветка отмены/повтора',
    'Підсвічування скасування/повтору',
    'Падсветка адмены/паўтору',
    'Surbrillance annuler/rétablir',
);

const DescriptionLocale = new I18nText(
    'Highlight changed structures for 3 seconds on undo/redo',
    'Подсвечивать изменённую область на 3 сек. при отмене и повторе действий',
    'Підсвічувати змінену область на 3 сек. під час скасування та повторення дій',
    'Падсвечваць змененую вобласць на 3 сек. пры адмене і паўторы дзеянняў',
    'Mettre en surbrillance la structure modifiée pendant 3 s lors de annuler/rétablir',
);

const OffLocale = new I18nText('Off', 'Выкл.', 'Вимк.', 'Выкл.', 'Désactivé');

const OnLocale = new I18nText('On', 'Вкл.', 'Увімк.', 'Укл.', 'Activé');

const OnZoomLocale = new I18nText(
    'On + Zoom',
    'Вкл. + Зум',
    'Увімк. + Зум',
    'Укл. + Зум',
    'Activé + Zoom',
);

export const UndoRedoHighlightSetting =
    new SelectSetting<UndoRedoHighlightMode>(
        'UndoRedoHighlight',
        UndoRedoHighlightMode.OFF,
        {
            name: NameLocale,
            description: DescriptionLocale,
            reloadOnChange: false,
            isMapSetting: false,
            group: OtherSettingGroup,
            order: 1,
        },
        [
            {
                value: UndoRedoHighlightMode.OFF,
                label: OffLocale,
            },
            {
                value: UndoRedoHighlightMode.ON,
                label: OnLocale,
            },
            {
                value: UndoRedoHighlightMode.ON_ZOOM,
                label: OnZoomLocale,
            },
        ],
    );
