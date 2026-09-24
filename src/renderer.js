const vertexSource = `attribute vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}`;

const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform float time,intensity,spread,angle,bloom,dispersion,grain;
uniform float showFrame,showGlass,enabled,palette;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float sdBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return min(max(q.x,q.y),0.)+length(max(q,0.))-r;}
float segment(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.,1.));}
float line(vec2 p,vec2 a,vec2 b,float width){return 1.-smoothstep(width,width+.0017,segment(p,a,b));}
vec3 hue(float x){return .55+.45*cos(6.28318*(x+vec3(0.,.67,.33)));}
vec3 spectrum(float k){vec3 c=hue(.77-k*.78);if(palette>.5&&palette<1.5)c=mix(vec3(.22,.42,1.),vec3(.55,1.,.94),k);if(palette>1.5)c=mix(vec3(1.,.055,.025),vec3(1.,.77,.22),k);return c;}
void main(){
vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;
vec2 p=uv;
float aspect=resolution.x/resolution.y;
float scale=clamp(aspect/1.42,.55,1.15);
p/=scale;
vec3 col=vec3(.009,.012,.014);
col+=vec3(.011,.017,.019)*exp(-length(p-vec2(.1,.05))*2.2);
float a=radians(angle);
vec2 dir=vec2(cos(a),sin(a));
vec2 norm=vec2(-dir.y,dir.x);
vec2 center=vec2(0.,.015);
vec2 rayP=p-center;
float along=dot(rayP,dir),across=dot(rayP,norm);
float pulse=1.+.025*sin(time*.7);
vec3 light=vec3(0.);
// One white incident beam separates into an additive spectrum after the pane.
float incoming=1.-smoothstep(-.08,.14,along);
float incidentWidth=.0025+.009*max(-along,0.);
light+=vec3(.79,.9,1.)*exp(-pow(across/incidentWidth,2.))*incoming*2.;
light+=vec3(.48,.7,.8)*exp(-abs(across)/(.023+.03*bloom))*incoming*.24*bloom;
for(int i=0;i<28;i++){
float k=float(i)/27.;
float slope=(k-.5)*(.018+dispersion*.31)*(.4+spread);
float wave=.0013*sin(time*.2+k*12.);
float offset=slope*max(along+.06,0.)+wave;
float width=.0045+max(along,0.)*(.005+spread*.015);
float d=across-offset;
float mask=smoothstep(-.16,.035,along);
vec3 c=spectrum(k);
light+=c*exp(-pow(d/width,2.))*mask*.15;
light+=c*exp(-abs(d)/(width+.035+.045*bloom))*mask*.015*bloom;
}
float sourcePower=intensity*enabled*pulse;
light*=sourcePower;
float glassD=sdBox(p-center,vec2(.155,.205),.032);
float glassMask=1.-smoothstep(-.001,.001,glassD);
if(showGlass>.5){
// Diffused light behind a subtly bowed, brushed optical surface.
float haze=exp(-pow(across/.072,2.))*exp(-abs(along)*1.9)*sourcePower;
vec3 frost=vec3(.055,.067,.073)+vec3(.10,.13,.15)*haze;
frost+=vec3(.019)*sin((p.x+p.y*.21)*1800.)*.2;
col=mix(col,frost,glassMask*.65);
light=mix(light,light*.67+vec3(.30,.36,.37)*haze*.38,glassMask);
}
col+=light;
if(showGlass>.5){
float rim=exp(-abs(glassD)*1000.);
float edgeLight=.04+.20*pow(clamp(dot(normalize(p-center),normalize(vec2(-.8,1.))),0.,1.),3.);
col+=rim*(vec3(.45,.56,.6)*edgeLight+light*.09);
col+=glassMask*vec3(.11,.15,.17)*pow(max(0.,1.-abs(p.x+.12)*20.),12.)*.22;
col+=vec3(.17,.19,.2)*line(p,vec2(-.108,.216),vec2(.105,.216),.0004);
}
if(showFrame>.5){
vec2 outer=vec2(.535,.365),inner=vec2(.405,.262);
// Recessed rear chamber and machined front perimeter.
float rear=abs(sdBox(p,inner,.004));
col+=vec3(.11,.135,.145)*(1.-smoothstep(.002,.005,rear));
col+=vec3(.021,.026,.029)*(1.-smoothstep(.006,.014,rear));
float front=abs(sdBox(p,outer,.012));
float metal=1.-smoothstep(.008,.01,front);
float machining=.96+.04*sin(p.y*340.+p.x*90.);
col=mix(col,vec3(.092,.105,.111)*machining+light*.08,metal);
col+=vec3(.19,.22,.235)*exp(-abs(front-.009)*1100.);
for(int i=0;i<4;i++){
vec2 s=vec2(mod(float(i),2.)*2.-1.,floor(float(i)/2.)*2.-1.);
vec2 f=outer*s,b=inner*s;
float rail=segment(p,f,b);
col=mix(col,vec3(.092,.11,.12)+light*.10,(1.-smoothstep(.003,.006,rail))*.9);
col+=vec3(.14,.17,.18)*line(p,f+vec2(.002,0.),b+vec2(.002,0.),.0007);
float bolt=length(p-(outer-vec2(.003,.003))*s);
col=mix(col,vec3(.025),1.-smoothstep(.004,.006,bolt));
col+=vec3(.18)*exp(-abs(bolt-.005)*1700.)*.35;
}
// Thin floor slats establish depth while preserving an empty stage.
for(int j=1;j<5;j++){
float t=float(j)/5.;float y=mix(-.262,-.365,t*t);
float x=mix(.405,.535,t*t);
col+=vec3(.045,.057,.063)*line(p,vec2(-x,y),vec2(x,y),.0007);
}
float floorGlow=exp(-abs(p.y+.32)*22.)*exp(-pow((p.x+.27)/.30,2.));
col+=vec3(.02,.035,.038)*floorGlow*sourcePower;
}
float vignette=1.-smoothstep(.4,1.1,length(uv))*.38;
col*=vignette;
col=1.-exp(-col*1.45);
col+=((hash(gl_FragCoord.xy+fract(time)*70.)-.5)*grain*.035);
gl_FragColor=vec4(max(col,0.),1.);
}`;

const defaults = { intensity: 1, spread: .55, angle: 38, bloom: .65, dispersion: .65, grain: .2, speed: .25, frame: true, glass: true, enabled: true, palette: 'spectrum', paused: false };

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) {
    throw new Error('Light preview unavailable: WebGL is not supported by this browser');
  }
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Light shader compilation failed: ${message}`);
    }
    return shader;
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Unable to link light renderer');
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const names = ['resolution','time','intensity','spread','angle','bloom','dispersion','grain','showFrame','showGlass','enabled','palette'];
  const uniforms = Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)]));
  let settings = { ...defaults };
  let animation = 0;
  let elapsed = 0;
  let previous = performance.now();
  let disposed = false;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function draw(now = performance.now()) {
    if (disposed || gl.isContextLost()) return;
    if (!settings.paused && !motion.matches) elapsed += Math.min((now - previous) / 1000, .05) * settings.speed;
    previous = now;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform1f(uniforms.time, elapsed);
    for (const key of ['intensity','spread','angle','bloom','dispersion','grain']) gl.uniform1f(uniforms[key], settings[key]);
    gl.uniform1f(uniforms.showFrame, settings.frame ? 1 : 0);
    gl.uniform1f(uniforms.showGlass, settings.glass ? 1 : 0);
    gl.uniform1f(uniforms.enabled, settings.enabled ? 1 : 0);
    gl.uniform1f(uniforms.palette, Math.max(0, ['spectrum','ice','ember'].indexOf(settings.palette)));
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function shouldAnimate() {
    return !disposed && !document.hidden && !settings.paused && !motion.matches && settings.speed > 0;
  }
  function tick(now) {
    animation = 0;
    if (!shouldAnimate()) return;
    draw(now);
    animation = requestAnimationFrame(tick);
  }
  function refresh() {
    cancelAnimationFrame(animation);
    animation = 0;
    previous = performance.now();
    if (!disposed && !document.hidden) draw(previous);
    if (shouldAnimate()) animation = requestAnimationFrame(tick);
  }
  const resizeObserver = new ResizeObserver(refresh);
  resizeObserver.observe(canvas);
  document.addEventListener('visibilitychange', refresh);
  motion.addEventListener('change', refresh);
  refresh();
  return {
    update(next) { settings = { ...settings, ...next }; refresh(); },
    exportImage() { draw(); return canvas.toDataURL('image/png'); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(animation);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', refresh);
      motion.removeEventListener('change', refresh);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}
