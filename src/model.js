export const limits={intensity:[0,2],spread:[0,1],angle:[-90,90],bloom:[0,1],dispersion:[0,1],grain:[0,1],speed:[0,1]};
export const initialState=()=>({intensity:1.1,spread:.55,angle:38,bloom:.55,dispersion:.65,grain:.15,speed:.2,frame:true,glass:true,enabled:true,paused:false,palette:'spectrum',connections:{source:true,dispersion:true,glass:true,bloom:true}});
export function reduce(state,action){
 if(action.type==='set' && limits[action.key] && Number.isFinite(action.value)){const [min,max]=limits[action.key];return {...state,[action.key]:Math.max(min,Math.min(max,action.value))};}
 if(action.type==='toggle' && ['frame','glass','enabled','paused'].includes(action.key))return {...state,[action.key]:!state[action.key]};
 if(action.type==='connection' && Object.hasOwn(state.connections,action.node))return {...state,connections:{...state.connections,[action.node]:!state.connections[action.node]}};
 if(action.type==='preset' && ['spectrum','ice','ember','empty'].includes(action.name)){const base=initialState();if(action.name==='empty')return {...base,enabled:false,frame:false,glass:false};return {...base,palette:action.name,...(action.name==='ice'?{spread:.3,dispersion:.35,angle:28}:action.name==='ember'?{spread:.7,angle:45,bloom:.7}:{})};}
 return state;
}
export function effectiveSettings(s){return {...s,enabled:s.enabled&&s.connections.source,dispersion:s.connections.dispersion?s.dispersion:0,glass:s.glass&&s.connections.glass,bloom:s.connections.bloom?s.bloom:0};}
