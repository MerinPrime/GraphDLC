#version 300 es
precision highp float;

in vec2 v_texcoord;
flat in float v_signal;

uniform sampler2D u_texture;
uniform float u_alpha;
uniform vec2 u_size;
uniform bool u_dark_theme;

out vec4 out_color;

const vec4 dark_signal_colors[] =
    vec4[](vec4(0.12, 0.13, 0.19, 1.0), vec4(0.85, 0.29, 0.29, 1.0),
           vec4(0.30, 0.44, 0.88, 1.0), vec4(0.80, 0.70, 0.30, 1.0),
           vec4(0.55, 0.91, 0.60, 1.0), vec4(0.90, 0.54, 0.21, 1.0),
           vec4(0.90, 0.60, 0.97, 1.0));

const vec4 light_signal_colors[] =
    vec4[](vec4(1.0, 1.0, 1.0, 1.0), vec4(1.0, 0.0, 0.0, 1.0),
           vec4(0.3, 0.5, 1.0, 1.0), vec4(1.0, 1.0, 0.0, 1.0),
           vec4(0.0, 0.8, 0.0, 1.0), vec4(1.0, 0.8, 0.2, 1.0),
           vec4(1.0, 0.2, 1.0, 1.0));

void main() {
  vec4 color = texture(u_texture, v_texcoord);
  vec3 gray = vec3(dot(color.rgb, vec3(0.299, 0.587, 0.114)));
  float scale = u_size.x;
  scale = smoothstep(16.0, 2.0, scale) * 0.66;
  color.rgb = mix(color.rgb, gray, scale);

  int signal_index = int(clamp(v_signal + 0.5, 0.0, 6.0));

  vec4 signal_color = u_dark_theme ? dark_signal_colors[signal_index]
                                   : light_signal_colors[signal_index];

  vec3 base = color.rgb + signal_color.rgb * (1.0 - color.a);
  float alpha = color.a * u_alpha;
  alpha = max(alpha, signal_color.a);
  out_color = vec4(base, alpha);
}
