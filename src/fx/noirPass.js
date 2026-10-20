// Postproceso noir: blanco y negro de alto contraste, solo sobrevive el rojo.
// También grano de película, viñeta, parpadeo y distorsión para los sustos.

export const NoirShader = {
  name: 'NoirShader',
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    grain: { value: 0.09 },
    vignette: { value: 1.15 },
    distort: { value: 0 },
    flash: { value: 0 },
    darkness: { value: 0 },
    redKeep: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float grain;
    uniform float vignette;
    uniform float distort;
    uniform float flash;
    uniform float darkness;
    uniform float redKeep;
    varying vec2 vUv;

    float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

    void main() {
      vec2 uv = vUv;
      if (distort > 0.0) {
        uv.x += sin(uv.y * 38.0 + time * 13.0) * 0.006 * distort;
        uv.y += sin(uv.x * 21.0 - time * 7.0) * 0.003 * distort;
        float band = step(0.985 - distort * 0.05, rand(vec2(floor(uv.y * 60.0), floor(time * 18.0))));
        uv.x += band * 0.03 * distort;
      }
      vec3 c = texture2D(tDiffuse, uv).rgb;
      if (distort > 0.0) {
        c.r = texture2D(tDiffuse, uv + vec2(0.004 * distort, 0.0)).r;
        c.b = texture2D(tDiffuse, uv - vec2(0.004 * distort, 0.0)).b;
      }

      float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // Curva de contraste en espacio lineal (antes del tone mapping)
      float g = pow(lum, 1.12) * 1.15;

      // El rojo puro se conserva
      float maxGB = max(c.g, c.b);
      float redness = smoothstep(0.02, 0.12, c.r - maxGB) * smoothstep(1.6, 3.5, c.r / max(maxGB, 0.002)) * redKeep;
      vec3 gray = vec3(g) * vec3(1.0, 0.985, 0.955);
      vec3 red = vec3(max(c.r, g) * 1.15, c.g * 0.4, c.b * 0.4);
      vec3 col = mix(gray, red, redness);

      // Viñeta
      vec2 d = vUv - 0.5;
      float v = 1.0 - dot(d, d) * vignette * 1.6;
      col *= clamp(v, 0.0, 1.0);

      // Parpadeo de proyector
      col *= 0.97 + 0.03 * sin(time * 47.0) * rand(vec2(floor(time * 24.0), 3.0));

      // Grano
      float n = rand(vUv * vec2(1920.0, 1080.0) + fract(time * 7.13)) - 0.5;
      col += n * grain * (0.35 + g);

      // Arañazos verticales ocasionales
      float scratchX = rand(vec2(floor(time * 9.0), 1.0));
      float scratch = step(0.93, rand(vec2(floor(time * 9.0), 7.0))) * smoothstep(0.0015, 0.0, abs(vUv.x - scratchX));
      col += scratch * 0.08;

      col = mix(col, vec3(1.6), flash);
      col *= 1.0 - darkness;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
