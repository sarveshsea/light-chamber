const vertexSource = `attribute vec2 position;
void main(){gl_Position=vec4(position,0.0,1.0);}`;

const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform vec2 pointer;
uniform float depth;
vec3 rotate(vec3 p){
 float yaw=pointer.x*.19-.12, pitch=pointer.y*.13+.075;
 p.xz=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw))*p.xz;
 p.yz=mat2(cos(pitch),-sin(pitch),sin(pitch),cos(pitch))*p.yz;
 return p;
}
vec2 project(vec3 p){p=rotate(p);return p.xy*1.06/(3.7-p.z);}
float seg(vec2 p,vec2 a,vec2 b){vec2 v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),.000001),0.,1.));}
float line(vec2 p,vec2 a,vec2 b,float w){return 1.-smoothstep(w,w+1.3/min(resolution.x,resolution.y),seg(p,a,b));}
vec3 spectral(float t){return clamp(vec3(1.5-abs(4.*t-3.),1.5-abs(4.*t-2.),1.5-abs(4.*t-1.)),0.,1.);}
vec3 rail(vec3 color,vec2 p,vec3 a,vec3 b,float width,float bright){
 vec2 x=project(a),y=project(b),v=normalize(y-x),n=vec2(-v.y,v.x);
 float signedD=dot(p-x,n),d=seg(p,x,y);
 float aa=1.2/min(resolution.x,resolution.y);
 float mask=1.-smoothstep(width,width+aa,d);
 float bevel=smoothstep(-width,-width*.48,signedD)*(1.-smoothstep(width*.50,width,signedD));
 float groove=exp(-pow((signedD-width*.3)/max(width*.10,.0002),2.));
 vec3 metal=mix(vec3(.085,.091,.095),vec3(.30,.315,.32),bevel)*bright;
 metal+=vec3(.37,.39,.40)*exp(-pow((signedD+width*.69)/(width*.13),2.))*bright;
 metal-=groove*vec3(.075)*bright;
 color=mix(color,metal,mask);
 color+=vec3(.095,.105,.11)*exp(-abs(d-width)*1200.)*bright;
 return color;
}
void main(){
 vec2 p=(gl_FragCoord.xy-resolution*.5)/min(resolution.x,resolution.y);
 vec3 color=vec3(.009,.011,.013);
 color+=vec3(.014,.018,.023)*exp(-length(p)*3.);
 float ground=exp(-pow((p.y+.36)/.055,2.)-pow(p.x/.38,2.));
 color+=ground*vec3(.013,.019,.024);
 // Every structural member shares the same perspective camera.
 for(int i=0;i<4;i++){
  float sx=mod(float(i),2.)*2.-1.,sy=floor(float(i)/2.)*2.-1.;
  color=rail(color,p,vec3(sx,sy,-.85),vec3(sx,sy,.85),.006, .72);
 }
 color=rail(color,p,vec3(-1.,-1.,-.85),vec3(1.,-1.,-.85),.009,.70);
 color=rail(color,p,vec3(-1.,1.,-.85),vec3(1.,1.,-.85),.011,.95);
 color=rail(color,p,vec3(-1.,-1.,-.85),vec3(-1.,1.,-.85),.009,.85);
 color=rail(color,p,vec3(1.,-1.,-.85),vec3(1.,1.,-.85),.009,.65);
 for(int j=0;j<8;j++){
  float z=mix(-.82,.82,float(j)/7.);
  color=rail(color,p,vec3(-.98,-1.,z),vec3(.98,-1.,z),.0033,.52);
 }
 for(int j=0;j<4;j++){
  float x=mix(-.88,.88,float(j)/3.);
  color=rail(color,p,vec3(x,-.995,-.85),vec3(x,-.995,.85),.0021,.8);
 }
 // An optical pane moves in world space, including its focal depth.
 vec3 center=vec3(pointer.x*.24,pointer.y*.18,depth*.46);
 float tilt=pointer.x*.53+.14, lean=pointer.y*.35;
 vec3 U=vec3(cos(tilt),0.,sin(tilt))*.46;
 vec3 V=vec3(-sin(tilt)*sin(lean),cos(lean),cos(tilt)*sin(lean))*.58;
 vec2 c=project(center),u=project(center+U)-c,v=project(center+V)-c;
 vec2 q=p-c;
 float det=u.x*v.y-u.y*v.x;
 vec2 local=vec2(q.x*v.y-q.y*v.x,u.x*q.y-u.y*q.x)/det;
 vec2 box=abs(local)-vec2(.88);
 float glassD=(length(max(box,0.))+min(max(box.x,box.y),0.)-.12)*min(length(u),length(v));
 float pane=1.-smoothstep(-.0008,.0008,glassD);
 vec3 source=center+vec3(-1.48,-1.48,.40);
 vec3 direction=normalize(vec3(.92+pointer.x*.23,1.05+pointer.y*.23,-.24+depth*.28));
 vec3 normal=normalize(cross(U,V));
 vec3 beam=vec3(0.);
 vec2 start=project(source);
 float incident=seg(p,start,c);
 beam+=vec3(.72,.85,1.)*exp(-pow(incident/.0017,2.))*2.;
 beam+=vec3(.56,.69,.84)*exp(-incident/.009)*.32;
 beam+=vec3(.34,.45,.60)*exp(-incident/.035)*.055;
 for(int k=0;k<25;k++){
  float t=float(k)/24.;
  vec3 fan=normalize(direction+vec3(.63,-.42,.17)*(t-.5)*(.55+depth*.14)+normal*pointer.x*.055);
  vec2 end=project(center+fan*2.8);
  vec2 axis=end-c;
  float along=clamp(dot(p-c,axis)/dot(axis,axis),0.,1.);
  float d=seg(p,c,end);
  float width=.0018+along*.009;
  vec3 hue=spectral(t);
  beam+=hue*exp(-pow(d/width,2.))*.115;
  beam+=hue*exp(-d/(width+.022))*.012;
 }
 float hot=exp(-length(p-c)*110.);
 beam+=vec3(.6,.75,.9)*hot*.20;
 // Frost is restrained so the spectral path remains legible through the glass.
 vec3 frost=vec3(.045,.051,.057)+vec3(.025,.033,.043)*(.5+.5*local.y);
 color=mix(color,frost,pane*.72);
 color+=beam*mix(1.,.73,pane);
 color+=pane*vec3(.10,.12,.14)*exp(-pow((local.x+local.y*.34+.56)/.22,2.))*.17;
 float rim=exp(-abs(glassD)*1500.);
 color+=rim*(vec3(.12,.15,.18)+vec3(.19)*smoothstep(-.4,.8,local.y-local.x));
 color+=vec3(.055,.073,.090)*exp(-abs(glassD-.0018)*1400.);
 // Machined front frame is drawn over the optical volume.
 color=rail(color,p,vec3(-1.,-1.,.85),vec3(-1.,1.,.85),.012,1.05);
 color=rail(color,p,vec3(1.,-1.,.85),vec3(1.,1.,.85),.012,.86);
 color=rail(color,p,vec3(-1.,1.,.85),vec3(1.,1.,.85),.015,1.18);
 color=rail(color,p,vec3(-1.,-1.,.85),vec3(1.,-1.,.85),.013,.85);
 for(int k=0;k<4;k++){
  vec3 pos=vec3(mod(float(k),2.)*2.-1.,floor(float(k)/2.)*2.-1.,.85);
  vec2 bolt=project(pos),d=p-bolt;
  float r=length(d);
  color=mix(color,vec3(.025,.029,.031),1.-smoothstep(.0028,.0037,r));
  color+=vec3(.28,.30,.31)*exp(-abs(r-.0036)*2300.);
  color=mix(color,vec3(.10),line(p,bolt-vec2(.0015,.0005),bolt+vec2(.0015,.0005),.00025));
 }
 color*=1.-smoothstep(.34,.85,length(p))*.30;
 color=pow(1.-exp(-color*1.7),vec3(.92));
 // Screen-locked interleaved gradient dithering: no temporal grain or flicker.
 float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));
 color=floor(clamp(color,0.,1.)*63.+dither)/63.;
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
  const uniforms = Object.fromEntries(['resolution', 'pointer', 'depth'].map(name => [name, gl.getUniformLocation(program, name)]));
  let state = { pointerX: 0, pointerY: 0, depth: 0 };
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
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  const observer = new ResizeObserver(draw);
  observer.observe(canvas);
  draw();
  return {
    update(next) {
      const finite = Object.fromEntries(Object.entries(next).filter(([key, value]) => key in state && Number.isFinite(value)).map(([key, value]) => [key, Math.max(-1, Math.min(1, value))]));
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
