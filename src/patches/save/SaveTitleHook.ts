export namespace SaveTitleHook {
    let isHooked: boolean = false;
    let originalTitle: string = '';
    let _isMapChanged: boolean = false;

    export function isMapChanged(): boolean {
        return _isMapChanged;
    }

    export function setIsMapChanged(state: boolean): void {
        _isMapChanged = state;
        if (isHooked) {
            document.title = originalTitle;
        }
    }

    export function tryHook(): void {
        if (isHooked) return;
        const descriptor = Object.getOwnPropertyDescriptor(
            Document.prototype,
            'title',
        );
        if (descriptor) {
            Object.defineProperty(document, 'title', {
                get() {
                    return descriptor.get?.call(this) ?? '';
                },
                set(val) {
                    originalTitle = val;
                    if (_isMapChanged) val = `* ${val}`;
                    descriptor.set?.call(this, val);
                },
                configurable: true,
                enumerable: true,
            });
            isHooked = true;
        }
    }

    export function tryUnhook() {
        if (isHooked) {
            delete (document as any).title;
        }
    }
}
