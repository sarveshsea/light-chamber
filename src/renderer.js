import derivativeNoise from './vendor/psrdnoise2.glsl?raw';

const vertexSource = `attribute vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}`;

const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform vec2 pointer;
uniform float depth;
uniform float time;
${derivativeNoise}

float segmentDistance(vec2 p,vec2 a,vec2 b){
 vec2 v=b-a;float d=max(dot(v,v),.000001);
 return length(p-a-v*clamp(dot(p-a,v)/d,0.,1.));
}
float stroke(vec2 p,vec2 a,vec2 b,float width,float aa){
 return 1.-smoothstep(width-aa,width+aa,segmentDistance(p,a,b));
}
float box(vec2 p,vec2 center,vec2 halfSize,float radius){
 vec2 q=abs(p-center)-halfSize+radius;
 return length(max(q,0.))+min(max(q.x,q.y),0.)-radius;
}
vec3 oklch(float hue){
 // OKLCH -> OKLab -> linear sRGB. Hue is in turns; clipping keeps the
 // high-chroma spectrum inside the display gamut without HSV substitution.
 float L=.74;float C=.255;float h=6.28318530718*hue;
 float a=C*cos(h),b=C*sin(h);
 float l_=L+.3963377774*a+.2158037573*b;
 float m_=L-.1055613458*a-.0638541728*b;
 float s_=L-.0894841775*a-1.2914855480*b;
 float l=l_*l_*l_,m=m_*m_*m_,s=s_*s_*s_;
 return clamp(vec3(4.0767416621*l-3.3077115913*m+.2309699292*s,
 -1.2684380046*l+2.6097574011*m-.3413193965*s,
 -.0041960863*l-.7034186147*m+1.7076147010*s),0.,1.);
}
float field(vec2 p,out vec2 gradient){
 vec2 dg;
 float n=psrdnoise(p*vec2(1.8,1.2)+vec2(-time*.12,time*.08),vec2(0.),time*.17,dg);
 float u=p.x*5.1+p.y*1.9-time*.82;
 float v=p.y*7.2-p.x*2.4+time*.58;
 float w=.090*sin(u)+.042*sin(v)+.026*n;
 gradient=.090*cos(u)*vec2(5.1,1.9)+.042*cos(v)*vec2(-2.4,7.2)+.026*dg*vec2(1.8,1.2);
 return w;
}
vec3 metal(vec3 color,vec2 p,vec2 a,vec2 b,float width,float aa,float shade){
 float d=segmentDistance(p,a,b);
 float edge=1.-smoothstep(width-aa,width+aa,d);
 float bevel=exp(-abs(d-width*1.9)*150.);
 color=mix(color,vec3(.66,.68,.69)*shade,edge);
 color+=vec3(.94,.96,.97)*bevel*.22*shade;
 return color;
}
void main(){
 float scale=min(resolution.x,resolution.y);
 vec2 p=(gl_FragCoord.xy-resolution*.5)/scale;
 float aspect=resolution.x/scale;
 float aa=1.15/scale;
 float halfW=.43;
 float halfH=.43;
 vec3 color=vec3(.955,.960,.961);
 // Soft paper field and faint drafting grid, kept quiet behind the mechanism.
 vec2 grid=abs(fract((p+vec2(2.))*24.)-.5);
 float gridLine=1.-smoothstep(.485,.5,min(grid.x,grid.y));
 color=mix(color,vec3(.929,.936,.939),gridLine*.10);
 float outside=box(p,vec2(0.),vec2(halfW,halfH),.014);
 color=mix(color,vec3(.905,.912,.915),1.-smoothstep(-aa,aa,outside));
 // Straight-on nested chassis: machined outer shell, stepped rebates, and rails.
 float outer=box(p,vec2(0.),vec2(halfW,halfH),.014);
 float inset=box(p,vec2(0.),vec2(halfW-.045,halfH-.045),.006);
 float cavity=box(p,vec2(0.),vec2(halfW-.13,halfH-.13),.004);
 float shell=smoothstep(-aa,aa,outer)*(1.-smoothstep(-aa,aa,inset));
 color=mix(color,vec3(.80,.818,.826),shell);
 float innerRail=smoothstep(-aa,aa,inset)*(1.-smoothstep(-aa,aa,cavity));
 color=mix(color,vec3(.89,.899,.903),innerRail);
 color=mix(color,vec3(.030,.039,.050),1.-smoothstep(-aa,aa,cavity));
 color+=vec3(.16,.18,.19)*exp(-abs(outer)*110.)*.18;
 color+=vec3(.11,.13,.14)*exp(-abs(inset)*150.)*.22;
 // Structural mullions and fasteners echo a precise optical test fixture.
 float yRail=abs(abs(p.y)-halfH*.835);
 float yMask=(1.-smoothstep(.003,.003+aa,yRail))*(1.-smoothstep(halfW-.025,halfW-.01,abs(p.x)));
 color=mix(color,vec3(.60,.625,.638),yMask);
 float xRail=abs(abs(p.x)-(halfW-.112));
 float xMask=(1.-smoothstep(.003,.003+aa,xRail))*(1.-smoothstep(halfH-.025,halfH-.01,abs(p.y)));
 color=mix(color,vec3(.70,.72,.73),xMask);
 for(int i=0;i<4;i++){
  float x=-halfW+.095+float(i)*(2.*halfW-.19)/3.;
  float screw=length(p-vec2(x,halfH-.075));
  color=mix(color,vec3(.34,.37,.39),1.-smoothstep(.012,.014,screw));
  color+=vec3(.99)*exp(-screw*250.)*.22;
  float screw2=length(p-vec2(x,-halfH+.075));
  color=mix(color,vec3(.34,.37,.39),1.-smoothstep(.012,.014,screw2));
 }
 // Fixed center pane: analytic traveling modes plus derivative-noise flutter.
 vec2 paneSize=vec2(halfW*.55,halfH*.58);
 vec2 paneCenter=vec2(-.015,.015);
 vec2 q=(p-paneCenter)/paneSize;
 vec2 grad;
 float displacement=field(q,grad);
 float paneDist=box(p,paneCenter,paneSize,.012);
 float paneMask=1.-smoothstep(-aa,aa,paneDist);
 float fold=clamp(length(grad)*.16,0.,1.);
 float weave=.5+.5*sin(q.x*91.+sin(q.y*33.+time*.7)*3.2+displacement*35.);
 float edgeGlow=exp(-max(abs(paneDist),0.)*48.);
 vec3 filmColor=vec3(.88,.91,.92)+vec3(.08,.09,.10)*fold;
 filmColor+=vec3(.19,.22,.24)*pow(weave,10.)*(.08+fold*.30);
 filmColor+=vec3(.40,.44,.45)*edgeGlow*.22;
 color=mix(color,filmColor,paneMask*.73);
 color+=vec3(.20,.25,.28)*paneMask*pow(max(0.,dot(normalize(vec3(-grad,1.)),normalize(vec3(.35,.2,.9)))),18.)*.42;
 // Cursor is the sole moving light source. The incident shaft converges on
 // the fixed film; changing source position moves the beam, never the chassis.
 vec2 source=vec2(clamp(pointer.x*aspect,-halfW+.16,halfW-.16),clamp(pointer.y,-.68,.68));
 vec2 impact=paneCenter+vec2(.01,.015);
 vec2 impactGradient;
 field((impact-paneCenter)/paneSize,impactGradient);
 float incoming=stroke(p,source,impact,.0038,aa);
 float incomingGlow=exp(-segmentDistance(p,source,impact)*72.);
 color+=vec3(1.,.98,.93)*(incoming*.76+incomingGlow*.052);
 float sourceDot=length(p-source);
 color+=vec3(1.,.91,.72)*exp(-sourceDot*105.)*.68;
 color+=vec3(.29,.34,.35)*exp(-sourceDot*360.)*.16;
 // Thin-film surface normal steers the spectral bundle. A seven-band fan is
 // drawn as separate smooth rays, with its hue defined in OKLCH above.
 // Trace a 3D incident ray into the undulating sheet, then out through a
 // nearby surface normal. The offset models the ray's path through film;
 // wavelength-dependent indices create real Snell dispersion at both faces.
 vec3 surfaceNormal=normalize(vec3(-impactGradient.x*.075/paneSize.x,-impactGradient.y*.075/paneSize.y,1.));
 vec3 incident=normalize(vec3(impact-source,-1.15-clamp(depth,-1.,1.)*.16));
 for(int i=0;i<7;i++){
  float f=float(i)/6.;
 float indexOfRefraction=mix(1.40,1.58,f);
  vec3 inside=refract(incident,surfaceNormal,1./indexOfRefraction);
  vec2 exitGradient;
  field((impact-paneCenter)/paneSize+inside.xy*.34,exitGradient);
  vec3 exitNormal=normalize(vec3(-exitGradient.x*.075/paneSize.x,-exitGradient.y*.075/paneSize.y,1.));
  vec3 transmitted=refract(inside,-exitNormal,indexOfRefraction);
  // Project the transmitted 3D path onto the front-facing drawing plane.
 // Keep Snell's wavelength-dependent bend from the curved film, then spread
 // the outgoing spectrum slightly in the drawing plane to make the dispersion
 // legible at canvas scale, as in an optical bench demonstration.
 vec2 incidentPlane=normalize(impact-source);
 vec2 emergent=length(transmitted.xy)>.0001?normalize(transmitted.xy):incidentPlane;
 // The real surface normal contributes a restrained Snell bend; anchoring it
 // to the incoming plane direction avoids total-internal-reflection flips on
 // the steepest flutter while preserving a readable bench-scale dispersion.
 emergent=normalize(mix(emergent,incidentPlane,.76));
 float spectralAngle=(f-.5)*.58;
 mat2 spread=mat2(cos(spectralAngle),-sin(spectralAngle),sin(spectralAngle),cos(spectralAngle));
 vec2 direction=normalize(spread*emergent);
 float cavityHalf=halfW-.13;
 float rayX=direction.x>=0.?(cavityHalf-.012-impact.x)/max(direction.x,.0001):(-cavityHalf+.012-impact.x)/min(direction.x,-.0001);
 float rayY=direction.y>=0.?(cavityHalf-.012-impact.y)/max(direction.y,.0001):(-cavityHalf+.012-impact.y)/min(direction.y,-.0001);
 vec2 endpoint=impact+direction*max(.08,min(1.46,min(rayX,rayY)));
  vec3 spectral=oklch(mix(.015,.83,f));
  float d=segmentDistance(p,impact,endpoint);
 float beam=1.-smoothstep(.0027-aa*.25,.0027+aa*.6,d);
  float glow=exp(-d*92.);
  float envelope=smoothstep(-.03,.035,dot(p-impact,direction));
  color=mix(color,spectral,beam*.94*envelope);
  color+=spectral*glow*.07*envelope;
  // Narrow paper-white glint tracks the top edge of each refracted beam.
  color+=vec3(.98,.99,1.)*exp(-abs(d-.0048)*850.)*.075*envelope;
 }
 // Fine optical-interference traces on the sheet follow the live gradient.
 float fringe=pow(.5+.5*cos(q.x*18.+q.y*12.+displacement*35.+time*.22),14.);
 color+=vec3(.48,.54,.57)*fringe*fold*.12*paneMask;
 // Layered construction: corner brackets, center ribs, fasteners, and lower
 // calibration combs read as physical fabricated parts without adding labels.
 color=metal(color,p,vec2(-halfW+.09,-halfH+.09),vec2(-halfW+.28,-halfH+.09),.0034,aa,.92);
 color=metal(color,p,vec2(-halfW+.09,-halfH+.09),vec2(-halfW+.09,-halfH+.28),.0034,aa,.92);
 color=metal(color,p,vec2(halfW-.09,-halfH+.09),vec2(halfW-.28,-halfH+.09),.0034,aa,.92);
 color=metal(color,p,vec2(halfW-.09,-halfH+.09),vec2(halfW-.09,-halfH+.28),.0034,aa,.92);
 color=metal(color,p,vec2(-halfW+.09,halfH-.09),vec2(-halfW+.28,halfH-.09),.0034,aa,.92);
 color=metal(color,p,vec2(-halfW+.09,halfH-.09),vec2(-halfW+.09,halfH-.28),.0034,aa,.92);
 color=metal(color,p,vec2(halfW-.09,halfH-.09),vec2(halfW-.28,halfH-.09),.0034,aa,.92);
 color=metal(color,p,vec2(halfW-.09,halfH-.09),vec2(halfW-.09,halfH-.28),.0034,aa,.92);
 for(int i=0;i<9;i++){
  float x=(float(i)-4.)*(halfW-.22)/4.;
  float tick=abs(p.x-x);
  float y=abs(p.y+halfH-.115);
  float mark=1.-smoothstep(.001,.001+aa,tick);
  mark*=1.-smoothstep(.035,.035+aa,y);
  color=mix(color,vec3(.37,.40,.41),mark*.64);
 }
 // Stable low-amplitude blue-noise-like dither cleans tonal bands without
 // crawling across the moving film. Dither is fixed in pixel coordinates.
 float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
 color=floor(clamp(color,0.,1.)*255.+dither*.5)/255.;
 gl_FragColor=vec4(color,1.);
}`;

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('This optical canvas requires a browser with WebGL enabled.');
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Unable to compile the optical canvas: ${message}`);
    }
    return shader;
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Unable to initialize the optical canvas.');
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(['resolution', 'pointer', 'depth', 'time'].map(name => [name, gl.getUniformLocation(program, name)]));
  let state = { pointerX: 0, pointerY: 0, depth: 0, time: 0 };
  let disposed = false;
  function draw() {
    if (disposed || gl.isContextLost()) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    gl.viewport(0, 0, width, height);
    gl.uniform2f(uniforms.resolution, width, height);
    gl.uniform2f(uniforms.pointer, state.pointerX, state.pointerY);
    gl.uniform1f(uniforms.depth, state.depth);
    gl.uniform1f(uniforms.time, state.time);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  const observer = new ResizeObserver(draw);
  observer.observe(canvas);
  draw();
  return {
    update(next) {
      const finite = Object.fromEntries(Object.entries(next).filter(([key, value]) => key in state && Number.isFinite(value)).map(([key, value]) => [key, key === 'time' ? Math.max(0, value) : Math.max(-1, Math.min(1, value))]));
      state = { ...state, ...finite };
      draw();
    },
    exportImage() { draw(); return canvas.toDataURL('image/png'); },
    dispose() {
      disposed = true;
      observer.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}
