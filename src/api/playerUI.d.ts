import { MapInfo } from "./map_info"; // TODO: Implement this
import { UIToolbarController } from "./ui_toolbar_controller";
import { UIPauseSign } from "./ui_pause_sign";
import { UIRange } from "./uiRange";
import { UIControlsHint } from "./ui_controls_hint";
import { UIMenu } from "./ui_menu";
import { PlayerAccess } from "./player_access";

export interface PlayerUI {
    mapInfo: MapInfo | undefined;
    toolbarController: UIToolbarController;
    pauseSign: UIPauseSign;
    menu: UIMenu | null;
    speedController: UIRange | null;
    controlsHint: UIControlsHint | null;
    autoSaveMessage: HTMLSpanElement;

    updateToolbar(groups: any): void;
    addSpeedController(): void;
    removeSpeedController(): void;
    isMenuOpen(): boolean;
    isMouseCaptured(): boolean;
    toggleMenu(callback: () => void): void;
    showAutoSaveMessage(message: string, error?: boolean): void;
    hideAutoSaveMessage(): void;
    addControlsHint(access: PlayerAccess): void;
    setControlsHintState(state: string): void;
    updateControlsHintRights(access: PlayerAccess): void;
    dispose(): void;
}

export type PlayerUIProto = new (mapInfo?: MapInfo) => PlayerUI;
