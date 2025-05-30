import {PatchLoader} from "./loader/patchloader";

const patchLoader = new PatchLoader();
patchLoader.hook();
patchLoader.addDefinitionPatch("ArrowShader", function (name: string, module: any): any {
    patchLoader.setDefinition("ArrowShader", class ArrowShaderRGB extends module {
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
