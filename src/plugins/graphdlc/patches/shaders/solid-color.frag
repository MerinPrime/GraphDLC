#version 300 es
precision highp float;

in vec2 v_texcoord;

uniform vec4 u_color;
uniform vec2 u_size;
uniform bool u_showBorder;

out vec4 out_color;

void main() {
  vec2 uv = v_texcoord;
  uv = abs(uv - 0.5);
  out_color = u_color;
  
  if (u_showBorder) {
    vec2 border = abs(u_size);
    border = 0.5 - 4.0 / border;
    if (any(greaterThan(uv, border))) {
      out_color.rgb *= out_color.rgb;
      out_color.a = 1.0;
    }
  }
}
