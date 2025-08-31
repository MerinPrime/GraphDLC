import {InfoContainerComponent} from "./infoContainerComponent";
import {TPSInfoComponent} from "./tpsInfoComponent";
import {CustomTPSComponent} from "./customTPSComponent";

export class CustomUI {
    constructor(
        public infoContainer?: InfoContainerComponent,
        public tpsInfo?: TPSInfoComponent,
        public customTPSField?: CustomTPSComponent,
    ) { }
}