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
const vec3 eye=vec3(2.35,1.55,6.7);
const vec3 target=vec3(0.,0.,0.);
const float bounds=1.22;
vec3 lightPosition(){return vec3(clamp(-.25+pointer.x*.95,-1.1,1.1),clamp(.65+pointer.y*.6,-1.1,1.1),.60+depth*.48);}
vec3 forward(){return normalize(target-eye);}
vec3 right(){return normalize(cross(forward(),vec3(0.,1.,0.)));}
vec3 up(){return cross(right(),forward());}
vec2 project(vec3 p){vec3 d=p-eye;return vec2(dot(d,right()),dot(d,up()))/dot(d,forward())*1.58;}
float segment(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.,1.));}
vec3 spectrum(float phase){return .52+.48*cos(6.2831853*(phase+vec3(0.,.333,.667)));}
// A broad wind mode plus differentiable simplex turbulence. Derivatives are
// carried into Newton intersection and the optical surface normal.
float film(vec2 q,out vec2 gradient){
 vec2 g;
 float n=psrdnoise(q*vec2(1.65,1.2)+vec2(-time*.11,time*.06),vec2(0.),time*.19,g);
 float a=q.x*4.8+q.y*2.3-time*.78;
 float b=q.y*5.5-q.x*1.9+time*.54;
 float wind=.125*sin(a)+.062*sin(b);
 gradient=.075*g*vec2(1.65,1.2)+.125*cos(a)*vec2(4.8,2.3)+.062*cos(b)*vec2(-1.9,5.5);
 return .12+wind+.075*n;
}
void planeHit(vec3 ro,vec3 rd,vec3 normal,float plane,inout float distance,inout vec3 hit,inout vec3 norm){
 float divisor=dot(rd,normal);
 if(abs(divisor)<.00001)return;
 float t=(plane-dot(ro,normal))/divisor;
 vec3 p=ro+rd*t;
 if(t>.001&&t<distance&&max(max(abs(p.x),abs(p.y)),abs(p.z))<bounds+.001){distance=t;hit=p;norm=normal;}
}
vec3 wall(vec3 ro,vec3 rd){
 float distance=100.;vec3 p=vec3(0.),normal=vec3(0.);
 planeHit(ro,rd,vec3(1.,0.,0.),-bounds,distance,p,normal);
 planeHit(ro,rd,vec3(-1.,0.,0.),-bounds,distance,p,normal);
 planeHit(ro,rd,vec3(0.,1.,0.),-bounds,distance,p,normal);
 planeHit(ro,rd,vec3(0.,-1.,0.),-bounds,distance,p,normal);
 planeHit(ro,rd,vec3(0.,0.,1.),-bounds,distance,p,normal);
 if(distance>99.)return vec3(.008,.009,.010);
 vec3 l=lightPosition()-p;
 float diffuse=max(dot(normalize(l),normal),0.);
 float falloff=1./(1.+dot(l,l)*.27);
 float hot=pow(diffuse,18.)*falloff;
 vec3 e=vec3(bounds)-abs(p);
 float seam=max(min(e.x,e.y),min(max(e.x,e.y),e.z));
 float top=max(-normal.y,0.);
 float seamLight=.22+.78*falloff;
 vec3 color=vec3(.020,.022,.023)+vec3(.022,.025,.028)*diffuse;
 color+=vec3(1.,.21,.025)*exp(-seam*12.)*.40*seamLight;
 color+=vec3(1.,.60,.24)*exp(-seam*42.)*1.2*seamLight;
 color+=vec3(1.,.91,.67)*exp(-seam*160.)*2.5*seamLight;
 color+=vec3(1.,.43,.095)*hot*.90;
 color+=vec3(1.,.78,.41)*pow(diffuse,55.)*falloff*2.3;
 color+=top*vec3(1.,.29,.075)*(.24+falloff*.26);
 color+=top*vec3(1.,.75,.42)*pow(diffuse,3.)*.75;
 // Soft reflected caustic ribbons remain confined to the physical panes.
 vec2 uv=abs(normal.y)>.5?p.xz:abs(normal.x)>.5?p.zy:p.xy;
 vec2 g;float flow=film(uv*.73,g);
 float caustic=pow(.5+.5*cos(uv.x*10.+uv.y*6.+flow*22.+lightPosition().x*2.-lightPosition().y),18.);
 color+=vec3(1.,.39,.11)*caustic*.025*diffuse;
 return color;
}
vec3 rail(vec3 color,vec2 screen,vec3 a,vec3 b,float width){
 float d=segment(screen,project(a),project(b));
 float aa=1.1/min(resolution.x,resolution.y);
 float mask=1.-smoothstep(width,width+aa,d);
 vec3 midpoint=(a+b)*.5;
 float illumination=1./(1.+length(lightPosition()-midpoint));
 vec3 metal=vec3(.045,.047,.047)+vec3(.11,.075,.041)*illumination;
 color=mix(color,metal,mask);
 color+=vec3(1.,.53,.24)*exp(-abs(d-width)*1200.)*.11*illumination;
 return color;
}
void main(){
 vec2 screen=(gl_FragCoord.xy-resolution*.5)/min(resolution.x,resolution.y);
 vec3 ray=normalize(forward()*1.58+right()*screen.x+up()*screen.y);
 vec3 color=wall(eye,ray);
 // Ray/height-field intersection solved with analytical Newton iterations.
 float t=(.12-eye.z)/ray.z;
 vec2 grad=vec2(0.);
 for(int i=0;i<5;i++){
  vec3 point=eye+ray*t;
  float height=film(point.xy,grad);
  float derivative=ray.z-dot(grad,ray.xy);
  float denominator=(derivative<0.?-1.:1.)*max(abs(derivative),.12);
  t-=clamp((point.z-height)/denominator,-.6,.6);
 }
 vec3 point=eye+ray*t;
 float height=film(point.xy,grad);
 // Sheet edges have the same deformation as the interior; no rigid card.
 vec2 extent=vec2(.61,.85);
 vec2 edge=extent-abs(point.xy);
 float sheetDistance=min(edge.x,edge.y);
 float aa=2.2/min(resolution.x,resolution.y);
 float sheet=smoothstep(-aa,aa,sheetDistance);
 sheet*=step(.001,t)*(1.-step(.015,abs(point.z-height)));
 // Avoid drawing the sheet through the near chamber side panes.
 float closest=100.;vec3 wh=vec3(0.),wn=vec3(0.);
 planeHit(eye,ray,vec3(-1.,0.,0.),-bounds,closest,wh,wn);
 planeHit(eye,ray,vec3(0.,-1.,0.),-bounds,closest,wh,wn);
 sheet*=step(t,closest);
 if(sheet>.0){
  vec3 normal=normalize(vec3(-grad,1.));
  vec3 light=normalize(lightPosition()-point);
  vec3 view=normalize(eye-point);
  float facing=clamp(dot(normal,view),0.,1.);
  float fresnel=.045+.955*pow(1.-facing,5.);
  // Separate wavelengths use distinct indices of refraction (Cauchy-like dispersion).
  vec3 r=wall(point,refract(ray,normal,1./1.44));
  vec3 g=wall(point,refract(ray,normal,1./1.48));
  vec3 b=wall(point,refract(ray,normal,1./1.54));
  vec3 transmission=vec3(r.r,g.g,b.b);
  float ndl=max(dot(normal,light),0.);
  vec3 halfVector=normalize(light+view);
  float highlight=pow(max(dot(normal,halfVector),0.),95.);
  float broad=pow(max(dot(normal,halfVector),0.),15.);
  // Optical path difference through a wind-stretched nanometric coating.
  float thickness=420.+height*550.+point.y*100.+sin(point.x*3.+time*.25)*55.;
  float opticalPath=2.*1.46*thickness*sqrt(max(.1,1.-(1.-facing*facing)/(1.46*1.46)));
  vec3 interference=.5+.5*cos(6.2831853*opticalPath/vec3(650.,510.,440.));
  vec3 iridescence=pow(interference,vec3(7.));
  float fold=pow(clamp(length(grad)*.9,0.,1.),1.4);
  vec3 sheetColor=transmission*.82+vec3(.055,.064,.070)*(.55+ndl*.5);
  sheetColor+=iridescence*(.035+fold*.18+broad*.28)*(.4+ndl*.6);
  sheetColor+=vec3(.68,.75,.77)*broad*.25;
  sheetColor+=vec3(1.,.90,.72)*highlight*3.2;
  sheetColor+=wall(point,reflect(ray,normal))*fresnel*.6;
  sheetColor+=vec3(.7,.79,.82)*exp(-max(sheetDistance,0.)*420.)*.3;
  color=mix(color,sheetColor,sheet);
 }
 // Fixed machined frame. Pointer appears only in lightPosition/illumination.

 color=rail(color,screen,vec3(-1.,-1.,1.)*bounds,vec3(-1.,1.,1.)*bounds,.0045);
 color=rail(color,screen,vec3(1.,-1.,1.)*bounds,vec3(1.,1.,1.)*bounds,.0045);
 color=rail(color,screen,vec3(-1.,1.,1.)*bounds,vec3(1.,1.,1.)*bounds,.0045);
 color=rail(color,screen,vec3(-1.,-1.,1.)*bounds,vec3(1.,-1.,1.)*bounds,.0045);
 color=1.-exp(-color*1.42);
 color=pow(color,vec3(.94));
 float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
 color=floor(clamp(color,0.,1.)*255.+dither)/255.;
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
