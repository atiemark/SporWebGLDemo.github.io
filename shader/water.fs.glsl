precision mediump float;

uniform sampler2D u_reflectionSampler;
uniform float u_invis;
uniform float u_time;
uniform vec3 u_lightVec;

uniform int u_octaves;
uniform float u_scale;
uniform float u_timeMult;


//uniform vec3 u_sunDirection;
//uniform vec3 u_sunColor;
//uniform vec3 u_horizonColor;
//uniform vec3 u_zenithColor;
//uniform float u_atmosphereDensity;
//uniform vec3 u_fogColor;
//uniform float u_fogDensity;
//uniform float u_fogFalloff;
//uniform float u_setInvis;

varying vec3 v_eyePos;
varying vec3 v_normal;
varying vec3 v_worldPos;
varying vec4 v_projPos;
varying vec2 v_texCoord;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;


float random (in vec2 _st) {
		return fract(sin(dot(_st, vec2(9343.9898,7782.233)))* 3758.5453123 * u_timeMult * u_time/4000000.);
}

float noise2d (in vec2 _st) {
    vec2 i = floor(_st);
    vec2 frac = fract(_st);

    // 8 corners in 3D of a cube
		float k = 1.0;

    float a = random(i);
    float b = random(i + vec2(k, 0.0));
    float c = random(i + vec2(0.0, k));
    float d = random(i + vec2(k, k));

    vec2 u = frac;

    return mix(mix(a,b, u.x), mix(c, d, u.x), u.y);
}


float fbm ( in vec2 _st) {
    float v = 0.0;
    float a = 1.0;

		vec2 offs = vec2(0., u_time*u_timeMult)/100.;

    for (int i = 0; i <50 ; ++i) {
			if(i == u_octaves){
				break;
			}
        v += a * noise2d(_st + offs);
				_st =  _st * 2.0 + offs;
        a *= 0.6;
    }
    return v;
}



vec2 calcReflCoords(vec2 d){
  vec3 invPrj = vec3(v_projPos.x,-v_projPos.y,v_projPos.z);
	vec2 screen = (invPrj.xy/invPrj.z + 1.0)*0.5;
  return vec2(screen.x,screen.y)+d;
}


vec2 calcDist(vec3 worldToEye, vec3 normal){
  float d = length(worldToEye);
  float dFac = max(d/100.0, 100.0);
  return normal.xz/dFac;
}


void main() {

	//vec4 noise = getNoise(v_worldPos.xz);
  vec2 st1 = v_texCoord*u_scale+ vec2(0, u_time*u_timeMult)*0.1;

  vec2 q = vec2(0.);
  q.x = fbm( st1 + 0.05*u_time);
  q.y = fbm( st1 + vec2(2.0) * 0.1 * u_time*u_timeMult);


  vec2 r = vec2(0.);
  r.x = fbm( st1 + q.x + vec2(1.7,9.2)*0.01*u_time*u_timeMult);
  r.y = fbm( st1 + q.y + vec2(8.3,2.8) * 0.03*u_time*u_timeMult);


  float df = 0.05;
  float fa = fbm(st1+r);
  float fb = fbm(st1+r + vec2(df, 0.));
  float fc = fbm(st1+r + vec2(0., df));
  float fd = fbm(st1+r + vec2(df, df));

  float nx = (fa - fb)*0.5 + (fc - fd)*0.5;
  float ny = (fa - fc)*0.5 + (fb - fd)*0.5;

  vec3 fn = normalize(vec3(1. + nx*1.5, 0.5, 1. +ny*1.5));

	float lInt = dot(fn, u_lightVec)+1.*.3;


	vec3 worldToEye = v_eyePos-v_worldPos;
	vec3 eyeDirection = normalize(worldToEye);

  vec2 distortion = calcDist(worldToEye, fn);

	vec2 reflectTexCoords = calcReflCoords(distortion);
	vec4 reflectionSample = texture2D(u_reflectionSampler, reflectTexCoords);


  vec3 rayDirection = normalize(v_worldPos - v_eyePos);


  vec4 texC = reflectionSample;
  vec4 waterColor = vec4(0.5, 0.6, 0.8, 1.0);
	float distance = length(worldToEye)/50.;
  gl_FragColor =  /*texC/(1.+distance+1.0)*/ + waterColor*(0.6+distance/10.) + (nx+ny)*5./(1.+(distance+1.0)) - vec4(0.3,0.25,0.3,0.0);


}
