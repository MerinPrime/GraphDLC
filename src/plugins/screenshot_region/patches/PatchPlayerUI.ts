import type { PlayerUI } from '@logic-arrows/player/player-ui';
import type { GraphDLC } from 'src/core/GraphDLC';
import type { PatchLoader } from 'src/core/PatchLoader';
import type { IPatcher } from '../../Patcher';
import {
    BitrateLabelLocale,
    CancelBtnLocale,
    FormatLabelLocale,
    FpsLabelLocale,
    RecordBtnLocale,
    RecordingTextLocale,
    TickIntervalLabelLocale,
    TotalFramesLabelLocale,
    VideoModalTitleLocale,
} from '../Locale';
import type { AnyRecordOptions, ExportFormat } from './types';

export const PatchPlayerUI: IPatcher = (
    patchLoader: PatchLoader,
    _graphDLC: GraphDLC,
) => {
    patchLoader.addDefinitionPatch('PlayerUI', (_module: typeof PlayerUI) => {
        return class PlayerUI extends _module {
            private recordDialog: HTMLDialogElement | null = null;
            private progressBanner: HTMLDivElement | null = null;
            private progressText: HTMLSpanElement | null = null;
            private progressBar: HTMLDivElement | null = null;
            private _isGifRecording: boolean = false;
            private onCancelRecordCallback: (() => void) | null = null;
            private abortController: AbortController | null = null;

            public get isRecordModalOpen(): boolean {
                return !!this.recordDialog?.open;
            }

            public isMenuOpen(): boolean {
                return super.isMenuOpen() || this.isRecordModalOpen;
            }

            public isMouseCaptured(): boolean {
                if (this.isRecordModalOpen || this._isGifRecording) return true;
                return super.isMouseCaptured();
            }

            public isGifRecording(): boolean {
                return this._isGifRecording;
            }

            public cancelGifRecording(): void {
                if (!this._isGifRecording) return;
                this._isGifRecording = false;

                if (this.abortController) {
                    this.abortController.abort();
                    this.abortController = null;
                }

                if (this.progressBanner) {
                    this.progressBanner.classList.remove('active');
                }

                if (this.onCancelRecordCallback) {
                    this.onCancelRecordCallback();
                    this.onCancelRecordCallback = null;
                }
            }

            public showVideoModal(
                onStartRecord: (options: AnyRecordOptions) => void,
                onCancel?: () => void,
            ): void {
                this.initRecordUI();
                this.onCancelRecordCallback = onCancel || null;

                if (this.recordDialog) {
                    this.recordDialog.showModal();
                }

                const recordBtn = this.recordDialog?.querySelector(
                    '#ui-rec-start',
                ) as HTMLButtonElement;
                const cancelBtn = this.recordDialog?.querySelector(
                    '#ui-rec-cancel',
                ) as HTMLButtonElement;

                const selectFormat = this.recordDialog?.querySelector(
                    '#ui-rec-format',
                ) as HTMLSelectElement;
                const inputFrames = this.recordDialog?.querySelector(
                    '#ui-rec-frames',
                ) as HTMLInputElement;
                const inputFps = this.recordDialog?.querySelector(
                    '#ui-rec-fps',
                ) as HTMLInputElement;
                const inputInterval = this.recordDialog?.querySelector(
                    '#ui-rec-interval',
                ) as HTMLInputElement;
                const inputBitrate = this.recordDialog?.querySelector(
                    '#ui-rec-bitrate',
                ) as HTMLInputElement;

                if (cancelBtn) {
                    cancelBtn.onclick = () => this.recordDialog?.close();
                }

                if (recordBtn) {
                    recordBtn.onclick = () => {
                        let format = (selectFormat?.value ||
                            'mp4') as ExportFormat;
                        if (format === 'png') format = 'mp4';
                        const totalFrames = Math.max(
                            1,
                            parseInt(inputFrames?.value || '40', 10),
                        );
                        const fps = Math.max(
                            1,
                            parseInt(inputFps?.value || '15', 10),
                        );
                        const tickInterval = Math.max(
                            1,
                            parseInt(inputInterval?.value || '1', 10),
                        );

                        this.recordDialog?.close();
                        this._isGifRecording = true;
                        this.showProgressBanner(0, format);

                        const onProgress = (
                            percent: number,
                            curFrame: number,
                            totalFrames: number,
                        ) => {
                            if (!this._isGifRecording) return;
                            this.updateProgress(percent, curFrame, totalFrames);
                        };

                        let options: AnyRecordOptions;
                        this.abortController = new AbortController();

                        if (format === 'mp4') {
                            const mbps = parseFloat(inputBitrate?.value || '2');
                            const bitrate =
                                mbps > 0
                                    ? Math.round(mbps * 1_000_000)
                                    : undefined;
                            options = {
                                format: 'mp4',
                                totalFrames,
                                fps,
                                tickInterval,
                                bitrate,
                                onProgress,
                                signal: this.abortController.signal,
                            };
                        } else {
                            options = {
                                format,
                                totalFrames,
                                fps,
                                tickInterval,
                                onProgress,
                                signal: this.abortController.signal,
                            };
                        }

                        onStartRecord(options);
                    };
                }
            }

            private updateProgress(
                percent: number,
                curFrame: number,
                totalFrames: number,
            ): void {
                const rounded = Math.min(100, Math.max(0, Math.round(percent)));
                if (this.progressText) {
                    this.progressText.innerText = `${RecordingTextLocale.get()} ${rounded}% (${curFrame}/${totalFrames})`;
                }
                if (this.progressBar) {
                    this.progressBar.style.width = `${rounded}%`;
                }
                if (rounded >= 100) {
                    setTimeout(() => {
                        this.cancelGifRecording();
                    }, 500);
                }
            }

            private showProgressBanner(
                initialPercent: number = 0,
                format?: ExportFormat,
            ): void {
                if (!this.progressBanner) return;
                this.progressBanner.classList.add('active');
                if (this.progressText) {
                    const fmtStr = format ? ` [${format.toUpperCase()}]` : '';
                    this.progressText.innerText = `${RecordingTextLocale.get()}${fmtStr} ${initialPercent}%`;
                }
                if (this.progressBar) {
                    this.progressBar.style.width = `${initialPercent}%`;
                }
            }

            private initRecordUI(): void {
                if (this.recordDialog) return;

                this.recordDialog = document.createElement('dialog');
                this.recordDialog.className = 'ui-record-modal';

                this.recordDialog.innerHTML = `
                    <div class="ui-record-title">${VideoModalTitleLocale.get()}</div>
                    <table class="ui-record-fields">
                        <tr class="ui-record-row">
                            <th>${FormatLabelLocale.get()}</th>
                            <td>
                                <select id="ui-rec-format" class="ui-record-input">
                                    <option value="mp4" selected>MP4</option>
                                    <option value="apng">APNG</option>
                                    <option value="gif">GIF</option>
                                </select>
                            </td>
                        </tr>
                        <tr class="ui-record-row">
                            <th>${TotalFramesLabelLocale.get()}</th>
                            <td>
                                <input
                                    id="ui-rec-frames"
                                    class="ui-record-input ui-record-input-number"
                                    type="number"
                                    value="40"
                                    min="1"
                                    max="2000"
                                />
                            </td>
                        </tr>
                        <tr class="ui-record-row">
                            <th>${FpsLabelLocale.get()}</th>
                            <td>
                                <input
                                    id="ui-rec-fps"
                                    class="ui-record-input ui-record-input-number"
                                    type="number"
                                    value="15"
                                    min="1"
                                    max="60"
                                />
                            </td>
                        </tr>
                        <tr class="ui-record-row">
                            <th>${TickIntervalLabelLocale.get()}</th>
                            <td>
                                <input
                                    id="ui-rec-interval"
                                    class="ui-record-input ui-record-input-number"
                                    type="number"
                                    value="1"
                                    min="1"
                                    max="20"
                                />
                            </td>
                        </tr>
                        <tr id="ui-rec-bitrate-row" class="ui-record-row">
                            <th>${BitrateLabelLocale.get()}</th>
                            <td>
                                <input
                                    id="ui-rec-bitrate"
                                    class="ui-record-input ui-record-input-number"
                                    type="number"
                                    value="2"
                                    step="0.5"
                                    min="0.5"
                                    max="20"
                                />
                            </td>
                        </tr>
                    </table>
                    <div class="ui-record-actions">
                        <button id="ui-rec-start" class="ui-record-btn ui-record-btn-start">
                            ${RecordBtnLocale.get()}
                        </button>
                        <button id="ui-rec-cancel" class="ui-record-btn ui-record-btn-cancel">
                            ${CancelBtnLocale.get()}
                        </button>
                    </div>
                `;

                const selectFormat = this.recordDialog.querySelector(
                    '#ui-rec-format',
                ) as HTMLSelectElement;
                const bitrateRow = this.recordDialog.querySelector(
                    '#ui-rec-bitrate-row',
                ) as HTMLElement;

                selectFormat.onchange = () => {
                    if (bitrateRow) {
                        bitrateRow.classList.toggle(
                            'hidden',
                            selectFormat.value !== 'mp4',
                        );
                    }
                };

                this.recordDialog.onmousedown = (e) => e.stopPropagation();
                document.body.appendChild(this.recordDialog);

                this.progressBanner = document.createElement('div');
                this.progressBanner.className = 'ui-record-progress-banner';

                const bannerTop = document.createElement('div');
                bannerTop.className = 'ui-record-progress-banner-top';

                this.progressText = document.createElement('span');
                this.progressText.className = 'ui-record-progress-text';
                this.progressText.innerText = `${RecordingTextLocale.get()}…`;

                const cancelRecordBtn = document.createElement('button');
                cancelRecordBtn.className = 'ui-record-progress-cancel';
                cancelRecordBtn.innerHTML = '&#x2715;';
                cancelRecordBtn.title = CancelBtnLocale.get();
                cancelRecordBtn.onclick = () => this.cancelGifRecording();

                bannerTop.appendChild(this.progressText);
                bannerTop.appendChild(cancelRecordBtn);

                const progressTrack = document.createElement('div');
                progressTrack.className = 'ui-record-progress-track';
                this.progressBar = document.createElement('div');
                this.progressBar.className = 'ui-record-progress-bar';
                progressTrack.appendChild(this.progressBar);

                this.progressBanner.appendChild(bannerTop);
                this.progressBanner.appendChild(progressTrack);
                this.progressBanner.onmousedown = (e) => e.stopPropagation();

                document.body.appendChild(this.progressBanner);
            }

            public dispose(): void {
                this.cancelGifRecording();
                this.recordDialog?.remove();
                this.progressBanner?.remove();
                super.dispose();
            }
        };
    });
};
