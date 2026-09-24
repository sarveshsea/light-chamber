import test from 'node:test';
import assert from 'node:assert/strict';
import {pointerPosition,advance,changeDepth} from '../src/motion.js';
test('pointer coordinates map to bounded spatial input',()=>{assert.deepEqual(pointerPosition(0,0,100,100),{x:-1,y:1});assert.deepEqual(pointerPosition(50,50,100,100),{x:0,y:0});assert.deepEqual(pointerPosition(300,-50,100,100),{x:1,y:1});assert.deepEqual(pointerPosition(0,0,0,0),{x:0,y:0});});
test('smoothing is monotonic, time based, and immutable',()=>{const s={x:0,y:0,depth:0};const t={x:1,y:-1,depth:.5};const n=advance(s,t,16,false);assert.ok(n.x>0&&n.x<1);assert.equal(s.x,0);assert.deepEqual(advance(s,t,16,true),t);assert.deepEqual(advance(t,t,16,false),t);assert.ok(advance(s,t,32,false).x>n.x);});
test('depth clamps scroll and invalid input',()=>{assert.equal(changeDepth(0,100),.12);assert.equal(changeDepth(1,100),1);assert.equal(changeDepth(-1,-100),-1);assert.equal(changeDepth(0,NaN),0);});
