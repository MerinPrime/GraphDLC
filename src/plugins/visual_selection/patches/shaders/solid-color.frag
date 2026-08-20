#version 300 es
precision highp float;

in vec2 v_texcoord;

uniform vec4 u_color;
uniform vec2 u_size;
uniform bool u_showBorder;
uniform bool u_isSelection;
uniform bvec4 u_sides;

out vec4 out_color;

void main() {
  if (u_isSelection) {
    vec2 uv = abs(v_texcoord - 0.5);
    out_color = u_color;

    if (u_showBorder) {
      vec2 border = 0.5 - 4.0 / abs(u_size);
      if (any(greaterThan(uv, border))) {
        out_color.rgb *= out_color.rgb;
        out_color.a = 1.0;
      }
    }
  } else {
    vec2 uv = v_texcoord;
    vec2 one_pixel = 1.0 / abs(u_size);

    vec2 min_bound = vec2(0.0);
    vec2 max_bound = vec2(1.0);

    out_color = u_color;

    if (u_showBorder) {
      float thickness_px = max(1.0, floor(abs(u_size.x) * 0.05 + 0.5));
      vec2 thickness = vec2(thickness_px) * one_pixel;

      vec2 inner_min = min_bound + thickness;
      vec2 inner_max = max_bound - thickness;

      bool isLeft = uv.x <= inner_min.x;
      bool isRight = uv.x >= inner_max.x;
      bool isTop = uv.y <= inner_min.y;
      bool isBottom = uv.y >= inner_max.y;

      bool isBorder = (isLeft && u_sides.x) || (isTop && u_sides.y) ||
                      (isRight && u_sides.z) || (isBottom && u_sides.w);

      if (isBorder) {
        out_color.rgb *= out_color.rgb;
        out_color.a = 1.0;
      }
    }
  }
}
