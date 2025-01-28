/**
 *
 */
'use strict';

var gl = null;
var ext = null;

const camera = {
  rotation: {
    x: 0,
    y: 0,
    z: 0
  },
  position: {
    x: 0,
    y: 0,
    z: 0
  }
};

var camPos = [0,3,-10];


//scene graph nodes
var root = null;
var gRoot = null;
var waterTransNode = null;
var worldEnvNode;
var sphereEnvNode;

var rotateLight;
var rotateNode;
var volNode;

//time variables
var globalTimeInMilliseconds;
var flicker1 = 0.3*Math.sin(globalTimeInMilliseconds + 100);

//matrices
var cameraMat = mat4.create();
var rotMatrix = mat4.create();
var viewMat = mat4.create();
var dirQuat = quat.create();
var axisangle = vec3.create();

//Framebuffer
var waterReflFBO;

//textures
var textureNode;
var textures;
var envcubetexture;
var waterReflTex;
var waterReflTex_d;
var skyBoxTexture;
//texture for back/frontface volume framebuffer
var tx;

//models
var screenRec;

//Lights
var reverseSunDirection = [0.5, 0.7, 1];

//shaders
var waterPrgr;
var frontBackPrgr
var volPrgr;
var simplePrgr;


//settings
var waterHeight = 0;
var waterLightVec = [-0.5, -1, -0.25];
var framebufferWidth = 512;
var framebufferHeight = 512;

var animRotXDeg = 0;


var volSettings = function(){};

  volSettings.colormult_r = 1.3;
  volSettings.colormult_g = 1.2;
  volSettings.colormult_b = 1.8;
  volSettings.num_octaves = 4;
  volSettings.scale = 10.0;
  volSettings.diffuse = 1.0;
  volSettings.brightness = 0.6;
  volSettings.nearBrightness = 0.1;
  volSettings.stepsize = 0.04;
  volSettings.maxsteps = 60;
  volSettings.contrast = 1.2;
  volSettings.seed = 2;
  volSettings.timemult = 0.5;
  volSettings.var = 20.0;
  volSettings.flickerIntensity = 1.0;
  volSettings.flickerSpeed = 1.0;
  volSettings.n2 = 4.55; // glass
  volSettings.n1 = 0.5;  // air




var waterSettings = function(){};
  waterSettings.water_fractal_octaves = 3;
  waterSettings.water_speed = 1;
  waterSettings.water_scale = 200;


// global Settings
var globalSettings = function(){};
globalSettings.useAnisotropicFiltering = false;
globalSettings.useMipmapping = false;
globalSettings.scale = 1.0;
globalSettings.width = 500;
globalSettings.height = 500;


//own variables
var uvScale = 1.0;

//load the required resources using a utility function
loadResources({
  env_skybox_pos_x: 'textures/skybox_cubemap_m/px.jpg',
  env_skybox_neg_x: 'textures/skybox_cubemap_m/nx.jpg',
  env_skybox_pos_y: 'textures/skybox_cubemap_m/py.jpg',
  env_skybox_neg_y: 'textures/skybox_cubemap_m/ny.jpg',
  env_skybox_pos_z: 'textures/skybox_cubemap_m/pz.jpg',
  env_skybox_neg_z: 'textures/skybox_cubemap_m/nz.jpg',

  cubeVs: 'shader/cube.vs.glsl',
  cubeFs: 'shader/cube.fs.glsl',

  textureVs:'shader/texture.vs.glsl',
  textureFs: 'shader/texture.fs.glsl',

  waterVs: 'shader/water.vs.glsl',
  waterFs: 'shader/water.fs.glsl',
  zipflzwicker:'models/zipflzwicker_2.obj',
  zipflhuaba:'models/Zipflhuaba.obj',
  chillumfish:'models/Chillumfish.obj',
  wolfModel: 'models/wolf.obj',
  box: 'models/boxUV.obj',
  sphere: 'models/sphere.obj',
  plane: 'models/plane.obj',
  volVs: 'shader/volumetric.vs.glsl',
  volFs: 'shader/volumetric.fs.glsl',
  frontBackVs: 'shader/frontBack.vs.glsl',
  frontBackFs: 'shader/frontBack.fs.glsl',
  simpleVs: 'shader/simple.vs.glsl',
  simpleFs: 'shader/simple.fs.glsl'
}).then(function (resources /*an object containing our keys with the loaded resources*/) {
  init(resources);
  render(0);
});

var modelKeys;;

function init(resources) {

  //create a GL context
  gl = createContext(globalSettings.width, globalSettings.height, false);
  console.log(gl.getSupportedExtensions());

  textures = {/*
   winter: [resources.env_winter_pos_x, resources.env_winter_neg_x,
     resources.env_winter_pos_y, resources.env_winter_neg_y,
     resources.env_winter_pos_z, resources.env_winter_neg_z,false],
   galaxy: [resources.env_pos_x,resources.env_neg_x,
     resources.env_pos_y, resources.env_neg_y, resources.env_pos_z, resources.env_neg_z,true],
   debug: [resources.env_debug_pos_x, resources.env_debug_neg_x,
     resources.env_debug_pos_y, resources.env_debug_neg_y,
     resources.env_debug_pos_z, resources.env_debug_neg_z,false],*/
   skybox: [resources.env_skybox_pos_x, resources.env_skybox_neg_x,
     resources.env_skybox_pos_y, resources.env_skybox_neg_y,
     resources.env_skybox_pos_z, resources.env_skybox_neg_z,false] };

  initCubeMap(resources,textures["skybox"]);

  //var initPos = vec3.fromValues(0., 0. -5);
  //mat4.fromTranslation(cameraMat, initPos);
  camera.position = [5,1,0];

  gl.enable(gl.DEPTH_TEST);

  //create
  waterPrgr = createProgram(gl, resources.waterVs, resources.waterFs);


  frontBackPrgr = createProgram(gl, resources.frontBackVs, resources.frontBackFs);
  volPrgr = createProgram(gl, resources.volVs, resources.volFs);
  simplePrgr = createProgram(gl, resources.simpleVs, resources.simpleFs);

  screenRec = makeRect(1, 1);

  root = createSceneGraph(gl, resources);

  modelKeys = [resources.zipflhuaba, resources.zipflzwicker, resources.chillumfish];

  initInteraction(gl.canvas);
  // init and show gui:
  initGUI();


}

/*
function createTextureAndFramebuffer(gl, width, height) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(
     gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return {tex: tex, fb: fb};
}*/


function waterinitWaterFBO(){

  var depthTextureExt = gl.getExtension("WEBGL_depth_texture");
  if(!depthTextureExt) { alert('No depth texture support!!!'); return; }

  waterReflFBO = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, waterReflFBO);

  waterReflTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, waterReflTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  //gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, waterReflTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,  gl.drawingBufferWidth,  gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, waterReflTex, 0);


  waterReflTex_d = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, waterReflTex_d);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, waterReflTex_d);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, waterReflTex_d ,0);


  if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!=gl.FRAMEBUFFER_COMPLETE)
    {alert('Framebuffer incomplete!');}
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}



class EnvironmentSGNode extends SGNode {

  constructor(envtexture, textureunit, doReflect, doRefract, useFresnel, children ) {
      super(children);
      this.envtexture = envtexture;
      this.textureunit = textureunit;
      this.doReflect = doReflect;
      this.doRefract = doRefract;
      this.useFresnel = useFresnel;
      this.n2 = 1.55;
      this.n1 = 1.0;
  }

  render(context)
  {
    let invView3x3 = mat3.fromMat4(mat3.create(), context.invViewMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(context.shader, 'u_invView3x3'), false, invView3x3);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_texCube'), this.textureunit);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useReflection'), this.doReflect);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useRefraction'), this.doRefract);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useFresnel'), this.useFresnel);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_refractionEta'), this.n1/this.n2);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_fresnelR0'), Math.pow((this.n1-this.n2)/(this.n1+this.n2),2));

    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.envtexture);

    super.render(context);

    gl.activeTexture(gl.TEXTURE0 + this.textureunit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }
}



function addVolumetric(model, resources, pos, rot, s, volSettings, envtexture){

  gl.getExtension('OES_texture_float');
  gl.getExtension('OES_texture_float_linear');
  gl.getExtension( "WEBKIT_WEBGL_depth_texture" );
  gl.getExtension( "MOZ_WEBGL_depth_texture" );

  let modelNode = new ShaderSGNode(
    volPrgr,
    [new TransformationSGNode(
      glm.transform({ translate: pos, rotateX : rot, scale: s }),
      [new RenderSGNode(volumeRenderer(model, frontBackPrgr, volPrgr, volSettings, envtexture))]
      //[new RenderSGNode(model)]
    )]
  );

  gRoot.append(modelNode);

}


function addStandardModel(model, vs, fs, pos, rot, s){

  let modelNode = new ShaderSGNode(
    createProgram(gl, vs, fs),
    [new TransformationSGNode(
      glm.transform({ translate: pos, rotateX : rot, scale: s }),
    [new RenderSGNode(model)])]
  );

  var bb = getAABB(model);
  gRoot.append(modelNode);
}

function addWater(model, resources, pos, r, s){
  var waterNode  = new ShaderSGNode(waterPrgr);
  let water = new RenderSGNode(waterRenderer(model));
  waterTransNode = new TransformationSGNode(glm.transform({ translate: pos, rotateX: r, scale: s}), [
      water
    ])
  waterNode.append(waterTransNode);

  gRoot.append(waterNode);
}

/*
function addSwarm(model, resources, count, pos, rot, distScale, distrFac){
  var arr = [];

  for(var i= 0; i<count; i++){
    let p = vec3.fromValues(Math.pow(Math.random(), distrFac), Math.pow(Math.random(), distrFac), Math.pow(Math.random(), distrFac));
    let ps = [Math.random(), Math.random(), Math.random()];
    let pps = [];

    for(var s= 0; s<3; s++){
      if(ps[s] > 0.5){
        pps[s] = -1. * p[s];
      }else{
        pps[s] = p[s];
      }
    }

    let volSettings = {
      colormult: [p[0]+0.5, p[1]+0.5, p[2]+0.5],
      num_octaves: 5,
      scale: 10.0,
      diffuse: 0.9,
      brightness: 0.1,
      nearBrightness: 0.2,
      stepsize: 0.01,
      maxsteps: 60,
      contrast: 10.5,
      seed: 2,
      timemult: 1.0,
      var: [p[0]*20, p[1]*20, p[2]*20]
    };

    let tscale = 2.5*(1./(vec3.distance(vec3.create(), p)*2.));
    addVolumetric(model, resources, pps*distScale, -90, tscale, volSettings, envcubetexture);
  }

}*/

function createSceneGraph(gl, resources) {

  //textures = {wood: resources.texture_diffuse, checkerboard: resources.texture_diffuse2};
  //create scenegraph
  root = new TransformationSGNode(mat4.create());
  gRoot = new TransformationSGNode(mat4.create());
  root.append(gRoot);

  //addStandardModel(resources.dolphinModel, resources.vs, resources.fs, [-1, -0.3, 0], 0, 0.1);

  ////debugger;
  //addVolumetric(resources.zipflzwicker, resources, [0, 0, 0], -90, 2.5, volSettings, envcubetexture);
  //addStandardModel(resources.zipflzwicker, resources.textureVs, resources.textureFs, [0, 0, 0], 90, 2.5);
  addVolumetric(resources.chillumfish, resources, [0, 0, 0], -90, 2.5, volSettings, envcubetexture);

  waterHeight = -1;
  addWater(makeRect(100,100), resources, [0, waterHeight, 0], 90);
  waterinitWaterFBO();

  //addSwarm(resources.zipflzwicker, resources, 2, [0,0,0], 0 , 3. , 1.5);
  var envnode = new ShaderSGNode(createProgram(gl, resources.cubeVs, resources.cubeFs));

  {
  //add skybox by putting large sphere around us
  worldEnvNode = new EnvironmentSGNode(envcubetexture,4,false,false,false,
                  new RenderSGNode(makeSphere(80)));
  envnode.append(worldEnvNode);
  gRoot.append(envnode)
}

{
  //initialize
  sphereEnvNode = new EnvironmentSGNode(envcubetexture,4,true,true,true,
      new RenderSGNode(makeSphere(1)));
  let sphere = new TransformationSGNode(glm.transform({ translate: [0,0, 0], rotateX : 0, rotateZ : 0, scale: 1.0 }),
                 sphereEnvNode );
                 //new RenderSGNode(resources.model)));
  //envnode.append(sphere);
}

  return root;
}


function initCubeMap(resources,env_imgs) {
  //create the texture
  envcubetexture = gl.createTexture();
  //define some texture unit we want to work on
  gl.activeTexture(gl.TEXTURE0);
  //bind the texture to the texture unit
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, envcubetexture);
  //set sampling parameters
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
  //gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.MIRRORED_REPEAT); //will be available in WebGL 2
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  //set correct image for each side of the cube map
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, env_imgs[6]);//flipping required for our skybox, otherwise images don't fit together
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[0]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[1]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[2]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[3]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[4]);
  gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, env_imgs[5]);
  //generate mipmaps (optional)
  gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  //unbind the texture again
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
}



function render(timeInMilliseconds) {
  checkForWindowResize(gl);
  const context = createSGContext(gl);

  //debugger;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0.9, 0.9, 0.9, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


  //setup context and camera matrices

  //very primitive camera implementation

  /* free camera
  rotMatrix = mat4.create();
  var rotX = mat4.create();
  var rotY = mat4.create();
  mat4.rotate(rotMatrix, rotMatrix, -camera.rotation.y/100, [1,0,0]);
  mat4.rotate(rotMatrix, rotMatrix, -camera.rotation.x/100, [0,1,0]);
  mat4.rotate(rotMatrix, rotMatrix, -camera.rotation.z/100, [0,0,1]);

  camera.rotation.y = 0;
  camera.rotation.x = 0;

  mat4.multiply(cameraMat, cameraMat, rotMatrix);

  var dirQuat = quat.create();
  var axisangle = vec3.create();
  var dir = quat.create();
  var dirVec = vec3.create();
  var dirVecZ = vec3.create();
  var dirVecX = vec3.create();
  mat4.getRotation(dir, cameraMat);
  quat.getAxisAngle(dirVec, dir);
  vec3.normalize(dirVec, dirVec);
  vec3.rotateX(dirVecZ, dirVec, [0,0,0], 90);
  vec3.rotateZ(dirVecX, dirVec, [0,0,0], 90);
  console.log(dirVecZ);

  //translate z (forward, backward)
  vec3.scale(dirVecZ, dirVecZ, camera.position.z);
  //vec3.scale(dirVecX, dirVecX, camera.position.x);
  mat4.translate(cameraMat,cameraMat, dirVecZ);
  //mat4.translate(cameraMat,cameraMat, dirVecZ);

  //reset the z and x
  camera.position.z = 0;
  camera.position.x = 0;
  */


  globalTimeInMilliseconds = timeInMilliseconds;
  flicker1 = volSettings.flickerIntensity*0.016*Math.sin(globalTimeInMilliseconds*volSettings.flickerSpeed + 100);
  animRotXDeg += 0.1;
  //context.timeInMilliseconds = timeInMilliseconds;
  //context.gl.uniform1f(gl.getUniformLocation(root.program, 'u_time'), timeInMilliseconds/1000.0);
  //context.gl.uniform1f(gl.getUniformLocation(root.program, 'u_UVscale'), uvScale);
  ////debugger;

  //gl.useProgram(waterPrgr);
  //setUpWaterUniforms(timeInMilliseconds);
  //bindWaterTextures();
  //water.render(context);
  //unbindWaterTextures();
  //debugger;
  //renderWaterReflection(context);
  //setUpCamera(false, context);
  //debugger;
  setUpCamera(false, context);
  gRoot.render(context);
  //renderScreenRect(context);

  //animate
  requestAnimationFrame(render);
}


function setUpCamera(refl, context){

  let tempPos = [0, 0, 0];
  if(refl == true){
    var dist = camPos[1] - waterHeight;
    tempPos = [camPos[0], camPos[1] - 2*dist, camPos[2]];
  }else{
    tempPos = camPos;
  }
  //tempPos[0] = tempPos[0] + Math.sin(globalTimeInMilliseconds*0.0001+0.01)/20;

  context.projectionMatrix = mat4.perspective(mat4.create(), convertDegreeToRadians(30), gl.drawingBufferWidth / gl.drawingBufferHeight, 0.01, 100);
  //very primitive camera implementation
  let lookAtMatrix = mat4.lookAt(mat4.create(), tempPos, [0,0.6,0], [0,1,0]);
  ////debugger;
  let mouseRotateMatrix;
  if(refl == true){
    mouseRotateMatrix = mat4.multiply(mat4.create(),
                           glm.rotateX(-camera.rotation.y),
                           glm.rotateY(camera.rotation.x+ animRotXDeg+150));
  }
  else{
    mouseRotateMatrix = mat4.multiply(mat4.create(),
                           glm.rotateX(camera.rotation.y),
                           glm.rotateY(camera.rotation.x+animRotXDeg+150));
  }

  context.viewMatrix = mat4.multiply(mat4.create(), lookAtMatrix, mouseRotateMatrix);
  context.invViewMatrix = mat4.invert(mat4.create(), context.viewMatrix);

}


function getAABB(model){
  var xmin = model.position[0];
  var ymin = model.position[1];
  var zmin = model.position[2];
  var xmax = xmin;
  var ymax = ymin;
  var zmax = zmin;
  for(var i = 0; i< model.position.length; i++){
    if(model.position[i] < xmin){
      xmin = model.position[i];
    }
    if(model.position[i] > xmax){
      xmax = model.position[i];
    }
    i++;
    if(model.position[i] < ymin){
      ymin = model.position[i];
    }
    if(model.position[i] > ymax){
      ymax = model.position[i];
    }
    i++;
    if(model.position[i] < zmin){
      zmin = model.position[i];
    }
    if(model.position[i] > zmax){
      zmax = model.position[i];
    }
  }
  console.log("P0 = " + xmin + " " + ymin + " " + zmin + " ");
  console.log("P1 = " + xmax + " " + ymax + " " + zmax + " ");

  return [xmin, ymin, zmin, xmax, ymax, zmax];
}

//camera control
function initInteraction(canvas) {
  const mouse = {
    pos: { x : 0, y : 0},
    leftButtonDown: false
  };
  function toPos(event) {
    //convert to local coordinates
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }
  canvas.addEventListener('mousedown', function(event) {
    mouse.pos = toPos(event);
    mouse.leftButtonDown = event.button === 0;
  });
  canvas.addEventListener('mousemove', function(event) {
      const pos = toPos(event);
      const delta = { x : mouse.pos.x - pos.x, y: mouse.pos.y - pos.y };
      if (mouse.leftButtonDown) {
        //add the relative movement of the mouse to the rotation variables
    		camera.rotation.x += delta.x;
    		camera.rotation.y += delta.y;
      }
      mouse.pos = pos;
  });
  canvas.addEventListener('mouseup', function(event) {
    mouse.pos = toPos(event);
    mouse.leftButtonDown = false;
  });
  //register globally
  document.addEventListener('keypress', function(event) {
    //https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
    if (event.code === 'KeyR') {
      camera.rotation.x = 0;
  		camera.rotation.y = 0;
      camera.rotation.z = 0;
    }
    if (event.code === 'KeyM') {
    //enable/disable mipmapping
    globalSettings.useMipmapping = !globalSettings.useMipmapping;
    toggleMipmapping( globalSettings.useMipmapping );
  }
  if (event.code === 'KeyA') {
    camera.position.x -= 0.1;
  }
  if (event.code === 'KeyD') {
    camera.position.x += 0.1;
  }
  if (event.code === 'KeyS') {
    camera.position.z += 0.1;
  }
  if (event.code === 'KeyW') {
    camera.position.z -= 0.1;
  }
  if (event.code === 'KeyQ') {
    camera.rotation.z -= 0.2;
  }
  if (event.code === 'KeyE') {
    camera.rotation.z += 0.2;
  }
});
}


function toggleMipmapping(value){
//enable/disable mipmapping
gl.activeTexture(textureNode.textureunit);
gl.bindTexture(gl.TEXTURE_2D, textureNode.textureId);
if(value)
{
  console.log('Mipmapping enabled');
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
}
else
{
  console.log('Mipmapping disabled');
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
}
gl.bindTexture(gl.TEXTURE_2D, null);
}

function toggleAnisotropicFiltering(value){
  //enable/disable anisotropic filtering (only visible in combination with mipmapping)
  var ext = gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");
  gl.activeTexture(textureNode.textureunit);
  gl.bindTexture(gl.TEXTURE_2D, textureNode.textureId);
  if(value)
  {
    console.log('Anisotropic filtering enabled');
    var max_anisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, max_anisotropy);
  }
  else
  {
    console.log('Anisotropic filtering disabled');
    gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 1);
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
}

function convertDegreeToRadians(degree) {
  return degree * Math.PI / 180
}

function changeScale(value){
    uvScale = value;
}

function initGUI(resources){

  var gui = new dat.GUI();

  gui.add( volSettings, 'colormult_r' );
  gui.add( volSettings, 'colormult_g' );
  gui.add( volSettings, 'colormult_b' );
  gui.add( volSettings, 'num_octaves' );
  gui.add( volSettings, 'scale' );
  gui.add( volSettings, 'diffuse' );
  gui.add( volSettings, 'brightness' );
  gui.add( volSettings, 'nearBrightness' );
  gui.add( volSettings, 'stepsize' );
  gui.add( volSettings, 'maxsteps' );
  gui.add( volSettings, 'contrast' );
  gui.add( volSettings, 'seed' );
  gui.add( volSettings, 'timemult' );
  gui.add( volSettings, 'var' );
  gui.add( volSettings, 'flickerIntensity' );
  gui.add( volSettings, 'flickerSpeed' );
  gui.add( volSettings, 'n2' );
  gui.add( volSettings, 'n1' );

  gui.add( waterSettings, 'water_fractal_octaves' );
  gui.add( waterSettings, 'water_scale' );
  gui.add( waterSettings, 'water_speed' );



  let curModel = function(){};
  curModel.change_model = Object.keys(modelKeys)[0];
  gui.add( curModel, 'change_model', Object.keys(modelKeys) ).onChange(function(value){
    addVolumetric(modelKeys[value], resources, [0, 0, 0], -90, 2.5, volSettings, envcubetexture);
  });

  gui.closed = false; // close gui to avoid using up too much screen

}


function renderWaterReflection(context){
  var gl = context.gl;

  //debugger;
  let waterMatrixBackup = waterTransNode.matrix;
  waterTransNode.matrix = glm.transform({ translate: [0,-10000,0] });

/*
  var backupProgr = context.shader;
  context.shader = waterPrgr;
  //activate the shader
  context.gl.useProgram(waterPrgr);
F
  gl.uniform1f(gl.getUniformLocation(context.shader, 'u_invis'), 1);


  context.shader = backupProgr;
  //activate the shader
  context.gl.useProgram(backupProgr);
*/

  //debugger;
  //render refelction texture

  gl.bindFramebuffer(gl.FRAMEBUFFER, waterReflFBO);
  ////debugger;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(1.0, 1.9, 1.0, 1.0);
  gl.clearDepth(1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  setUpCamera(true, context);
  gRoot.render(context);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  setUpCamera(false, context);

  /*
  gl.uniform1f(gl.getUniformLocation(context.shader, 'u_invis'), 0);
  */

  waterTransNode.matrix = waterMatrixBackup;
}


function renderScreenRect(context){
//  debugger;
  var gl = context.gl;
  var numItems = screenRec.index ? screenRec.index.length : screenRec.position.length / 3;

  var position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(screenRec.position), gl.STATIC_DRAW);

  if (screenRec.texture) {
    var texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(screenRec.texture), gl.STATIC_DRAW);
  }



  var shader = context.shader;
  if (!shader) {
    return;
  }

  //set attributes
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  var positionLoc = gl.getAttribLocation(shader, 'a_position');
  gl.enableVertexAttribArray(positionLoc);
  gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
  var texCoordLoc = gl.getAttribLocation(shader, 'a_texCoord');
  if (isValidAttributeLocation(texCoordLoc) && screenRec.texture) {
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
  }

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, waterReflTex);
  //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  //debugger;
  var textureLoc = gl.getUniformLocation(context.shader, 'u_reflectionSampler');
  if (isValidUniformLocation(textureLoc) ){
    gl.uniform1i(textureLoc, 0);
  }else{
    console.log(textureLoc + " is not a valid texturelocation.");
  }

  //render elements
  if (screenRec.index) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.drawElements(gl.TRIANGLES, numItems, gl.UNSIGNED_SHORT, 0);
  }
  else {
    gl.drawArrays(gl.TRIANGLES, numItems, 0);
  }

}

function waterRenderer(model) {
//debugger;
  //number of vertices
  var numItems = model.index ? model.index.length : model.position.length / 3;
  var position = null;
  var texCoordBuffer = null;
  var normalBuffer = null;
  var tangentBuffer = null;
  var colorBuffer = null;
  var indexBuffer = null;
  //first time init of buffers
  function init(gl) {
    position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.position), gl.STATIC_DRAW);
    if (model.texture) {
      texCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.texture), gl.STATIC_DRAW);
    }
    if (model.normal) {
      normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normal), gl.STATIC_DRAW);
    }

    if (model.normal && model.texture) {
      // if normals exist, also calculate tangent (and bitangent in Shader):
      var index = model.index;
      if (!index) {
        index = [];

        for (var i = 1; i < (model.position.length/3); i++) {
           index.push(i);
        }

      }
      model.tangent = calculateTangents(index, model.position, model.texture, model.normal);
      tangentBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.tangent), gl.STATIC_DRAW);
    }
    if (model.index) {
      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.index), gl.STATIC_DRAW);
    }
    if (model.color){
      colorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.color), gl.STATIC_DRAW);
    }
  }

  return function (context) {
    var gl = context.gl;


    var shader = context.shader;
    if (!shader) {
      return;
    }
    if (position === null) {
      //lazy init
      init(gl);
    }
    //set attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    var positionLoc = gl.getAttribLocation(shader, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    var texCoordLoc = gl.getAttribLocation(shader, 'a_texCoord');
    if (isValidAttributeLocation(texCoordLoc) && model.texture) {
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.enableVertexAttribArray(texCoordLoc);
      gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    }
    var normalLoc = gl.getAttribLocation(shader, 'a_normal');
    if (isValidAttributeLocation(normalLoc) && model.normal) {
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.enableVertexAttribArray(normalLoc);
      gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    }
    var tangentLoc = gl.getAttribLocation(shader, 'a_tangent');
    if (isValidAttributeLocation(tangentLoc) && model.tangent ) {
      gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
      gl.enableVertexAttribArray(tangentLoc);
      gl.vertexAttribPointer(tangentLoc, 3, gl.FLOAT, false, 0, 0);
    }
    var colorLoc = gl.getAttribLocation(shader, 'a_color');
    if (isValidAttributeLocation(colorLoc) && model.color) {
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
    }


    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, waterReflTex);
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    var textureLoc = gl.getUniformLocation(context.shader, 'u_reflectionSampler');
    if (isValidUniformLocation(textureLoc) ){
      gl.uniform1i(textureLoc, 0);
    }else{
      console.log(textureLoc + " is not a valid texturelocation.");
    }

    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_time'), globalTimeInMilliseconds/1200.0);
    gl.uniform3fv(gl.getUniformLocation(context.shader, 'u_lightVec'), waterLightVec);

    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_octaves'), waterSettings.water_fractal_octaves);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_scale'), waterSettings.water_scale);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_timeMult'), waterSettings.water_speed);


    //render elements
    if (model.index) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, numItems, gl.UNSIGNED_SHORT, 0);
    }
    else {
      gl.drawArrays(gl.TRIANGLES, numItems, 0);
    }

  };
}




function volumeRenderer(model, frontBackPrgr, volPrgr, volSettings, envtexture) {
  //number of vertices
  var numItems = model.index ? model.index.length : model.position.length / 3;
  var position = null;
  var texCoordBuffer = null;
  var normalBuffer = null;
  var tangentBuffer = null;
  var colorBuffer = null;
  var indexBuffer = null;
  //first time init of buffers
  function init(gl) {
    position = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.position), gl.STATIC_DRAW);

    if (model.texture) {
      texCoordBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.texture), gl.STATIC_DRAW);
    }
    if (model.normal) {
      normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.normal), gl.STATIC_DRAW);
    }

    if (model.normal && model.texture) {
      // if normals exist, also calculate tangent (and bitangent in Shader):
      var index = model.index;
      if (!index) {
        index = [];

        for (var i = 1; i < (model.position.length/3); i++) {
           index.push(i);
        }

      }
      model.tangent = calculateTangents(index, model.position, model.texture, model.normal);
      tangentBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.tangent), gl.STATIC_DRAW);
    }
    if (model.index) {
      indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(model.index), gl.STATIC_DRAW);
    }
    if (model.color){
      colorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(model.color), gl.STATIC_DRAW);
    }
  }



  return function (context) {
    //debugger;

    //set current shader
    context.shader = frontBackPrgr;
    //activate the shader
    context.gl.useProgram(frontBackPrgr);

    var gl = context.gl;
    var shader = context.shader;
    if (!shader) {
      return;
    }

    init(gl);

    //set matrix uniforms
    var modelViewMatrix = mat4.multiply(mat4.create(), context.viewMatrix, context.sceneMatrix);
    var normalMatrix = mat3.normalFromMat4(mat3.create(), modelViewMatrix);
    var projectionMatrix = context.projectionMatrix;

    shader = context.shader;
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_modelView'), false, modelViewMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_normalMatrix'), false, normalMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_projection'), false, projectionMatrix);
    // seperate model and seperate view matrices
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_model'), false, context.sceneMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_view'), false, context.viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_invView'), false, mat4.invert(mat4.create(),context.viewMatrix));
    var normalMMatrix = mat3.normalFromMat4(mat3.create(), context.sceneMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_modelNormalMatrix'), false, normalMMatrix);
    var normalMVMatrix = mat3.normalFromMat4(mat3.create(), modelViewMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_modelViewNormalMatrix'), false, normalMVMatrix);
    var normalInvViewMatrix = mat3.invert(mat3.create(), mat3.normalFromMat4(mat3.create(),context.viewMatrix));
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_invViewNormalMatrix'), false, normalInvViewMatrix);

    var invViewProjMatrix = mat4.invert(mat4.create(),
          mat4.multiply(mat4.create(), context.projectionMatrix, context.viewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_invViewProjMatrix'), false, invViewProjMatrix);

    //send time
    gl.uniform1f(gl.getUniformLocation(shader, 'u_time'), globalTimeInMilliseconds/3000.0);

/* --SETUP TEXTURE FOR FRONT AND BACK -- */

    //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    //debugger;
    //set attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    var positionLoc = gl.getAttribLocation(shader, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    var texCoordLoc = gl.getAttribLocation(shader, 'a_texCoord');
    if (isValidAttributeLocation(texCoordLoc) && model.texture) {
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.enableVertexAttribArray(texCoordLoc);
      gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    }
    var normalLoc = gl.getAttribLocation(shader, 'a_normal');
    if (isValidAttributeLocation(normalLoc) && model.normal) {
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.enableVertexAttribArray(normalLoc);
      gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    }
    var tangentLoc = gl.getAttribLocation(shader, 'a_tangent');
    if (isValidAttributeLocation(tangentLoc) && model.tangent ) {
      gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
      gl.enableVertexAttribArray(tangentLoc);
      gl.vertexAttribPointer(tangentLoc, 3, gl.FLOAT, false, 0, 0);
    }
    var colorLoc = gl.getAttribLocation(shader, 'a_color');
    if (isValidAttributeLocation(colorLoc) && model.color) {
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
    }


    let tx = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    let fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0);


    let depth = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depth);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);


    //setup viewport
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(1.0, 1.9, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.FRONT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    //render elements
    if (model.index) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, numItems, gl.UNSIGNED_SHORT, 0);
    }
    else {
      gl.drawArrays(gl.TRIANGLES, numItems, 0);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);


//---------------------------------------------------------------------------------------------------------------------------------------------------------
    //render front (needed for shadows)
    let tx_f = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tx_f);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.FLOAT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    let fb_f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb_f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx_f, 0);


    let depth_f = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depth_f);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth_f, 0);


    //setup viewport
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(1.0, 1.9, 1.0, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.depthMask(true);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    //render elements
    if (model.index) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, numItems, gl.UNSIGNED_SHORT, 0);
    }
    else {
      gl.drawArrays(gl.TRIANGLES, numItems, 0);
    }

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);



//---------------------------------------------------------------------------------------------------------------------------------------------------------
    //2nd renderpass to canvas
    //switch program
    //set current shader
    context.shader = volPrgr;
    //activate the shader
    context.gl.useProgram(volPrgr);

    var gl = context.gl;
    var shader = context.shader;
    if (!shader) {
      return;
    }

    init(gl);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    //setup viewport
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //set matrix uniforms
    var modelViewMatrix = mat4.multiply(mat4.create(), context.viewMatrix, context.sceneMatrix);
    var normalMatrix = mat3.normalFromMat4(mat3.create(), modelViewMatrix);
    var projectionMatrix = context.projectionMatrix;

    shader = context.shader;
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_modelView'), false, modelViewMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_normalMatrix'), false, normalMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_projection'), false, projectionMatrix);
    // seperate model and seperate view matrices
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_model'), false, context.sceneMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_view'), false, context.viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_invView'), false, mat4.invert(mat4.create(),context.viewMatrix));
    var normalMMatrix = mat3.normalFromMat4(mat3.create(), context.sceneMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_modelNormalMatrix'), false, normalMMatrix);
    var normalMVMatrix = mat3.normalFromMat4(mat3.create(), modelViewMatrix);
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_modelViewNormalMatrix'), false, normalMVMatrix);
    var normalInvViewMatrix = mat3.invert(mat3.create(), mat3.normalFromMat4(mat3.create(),context.viewMatrix));
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_invViewNormalMatrix'), false, normalInvViewMatrix);

    var invViewProjMatrix = mat4.invert(mat4.create(),
          mat4.multiply(mat4.create(), context.projectionMatrix, context.viewMatrix));
    gl.uniformMatrix4fv(gl.getUniformLocation(shader, 'u_invViewProjMatrix'), false, invViewProjMatrix);

    //set attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, position);
    var positionLoc = gl.getAttribLocation(context.shader, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    var texCoordLoc = gl.getAttribLocation(context.shader, 'a_texCoord');
    ////debugger;
    if (isValidAttributeLocation(texCoordLoc) && model.texture) {
      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.enableVertexAttribArray(texCoordLoc);
      gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    }
    var normalLoc = gl.getAttribLocation(context.shader, 'a_normal');
    if (isValidAttributeLocation(normalLoc) && model.normal) {
      gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
      gl.enableVertexAttribArray(normalLoc);
      gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    }
    var tangentLoc = gl.getAttribLocation(context.shader, 'a_tangent');
    if (isValidAttributeLocation(tangentLoc) && model.tangent ) {
      gl.bindBuffer(gl.ARRAY_BUFFER, tangentBuffer);
      gl.enableVertexAttribArray(tangentLoc);
      gl.vertexAttribPointer(tangentLoc, 3, gl.FLOAT, false, 0, 0);
    }
    var colorLoc = gl.getAttribLocation(context.shader, 'a_color');
    if (isValidAttributeLocation(colorLoc) && model.color) {
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.enableVertexAttribArray(colorLoc);
      gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
    }


    //use back and front textures for fs
    //gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tx);
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    var textureLoc = gl.getUniformLocation(context.shader, 'u_back');
    if (isValidUniformLocation(textureLoc) ){
      gl.uniform1i(textureLoc, 0);
    }else{
      console.log(textureLoc + " is not a valid texturelocation.");
    }

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, tx_f);
    //gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.drawingBufferWidth, gl.drawingBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    var textureLoc = gl.getUniformLocation(context.shader, 'u_front');
    if (isValidUniformLocation(textureLoc) ){
      gl.uniform1i(textureLoc, 1);
    }else{
      console.log(textureLoc + " is not a valid texturelocation.");
    }

    //send screensiz*e needed for texture lookup
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_screenRexX'), gl.drawingBufferWidth);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_screenRexY'), gl.drawingBufferHeight);


    //send time
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_time'), globalTimeInMilliseconds/1200.0);



    gl.uniform3fv(gl.getUniformLocation(context.shader, 'u_vol.colormult'), [volSettings.colormult_r, volSettings.colormult_g, volSettings.colormult_b]);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_vol.num_octaves'), volSettings.num_octaves);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_vol.scale'), volSettings.scale);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_vol.diffuse'), volSettings.diffuse + flicker1*2.);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_vol.brightness'), volSettings.brightness + flicker1);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_vol.nearBrightness'), volSettings.nearBrightness);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_vol.stepsize'), volSettings.stepsize);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_vol.maxsteps'), volSettings.maxsteps);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_vol.contrast'), volSettings.contrast);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_vol.seed'), volSettings.seed);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_vol.timemult'), volSettings.timemult);
    gl.uniform3fv(gl.getUniformLocation(context.shader, 'u_vol.var'), [volSettings.var, 0.0, 1.0]);


    //set additional shader parameters vor the env shading
    let textureunit = 4;
    let doReflect = true;
    let doRefract = true;
    let useFresnel = true;


    let invView3x3 = mat3.fromMat4(mat3.create(), context.invViewMatrix); //reduce to 3x3 matrix since we only process direction vectors (ignore translation)
    gl.uniformMatrix3fv(gl.getUniformLocation(context.shader, 'u_invView3x3'), false, invView3x3);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_texCube'), textureunit);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useReflection'), doReflect);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useRefraction'), doRefract);
    gl.uniform1i(gl.getUniformLocation(context.shader, 'u_useFresnel'), useFresnel);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_refractionEta'), volSettings.n1/volSettings.n2);
    gl.uniform1f(gl.getUniformLocation(context.shader, 'u_fresnelR0'), Math.pow((volSettings.n1-volSettings.n2)/(volSettings.n1+volSettings.n2),2));


    //activate and bind texture
    gl.activeTexture(gl.TEXTURE0 + textureunit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, envtexture);



    gl.disable(gl.CULL_FACE);
    //gl.enable(gl.DEPTH_TEST);
    //gl.depthFunc(gl.LESS);

    //setup viewport
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.clearColor(0.9, 0.9, 0.9, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //render elements
    if (model.index) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, numItems, gl.UNSIGNED_SHORT, 0);
    }
    else {
      gl.drawArrays(gl.TRIANGLES, numItems, 0);
    }


    //clean up
    gl.activeTexture(gl.TEXTURE0 + textureunit);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, null);


  };
}
