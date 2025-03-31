import { ModLoaderV2 } from "./modloader_v2";

ModLoaderV2.addDefinitionPatch("ArrowShader", function (name: string, module: any): any {
    ModLoaderV2.setDefinition("ArrowShader", class ArrowShaderRGB extends module {
        makeFragmentShader(): string {
            let shaderCode: string = super.makeFragmentShader();
            
            shaderCode = shaderCode.replace(
                "if (u_signal == 5) signalColor = vec4(1.0, 0.8, 0.2, 1.0);",
                "if (u_signal == 5) signalColor = vec4(0.0, 0.8, 0.0, 1.0);"
            );
            
            return shaderCode;
        }
    });
});