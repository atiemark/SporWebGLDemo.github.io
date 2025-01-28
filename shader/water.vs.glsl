 attribute vec3 a_position;
 attribute vec3 a_normal;
 attribute vec2 a_texCoord;


uniform mat4 u_modelView;
uniform mat4 u_projection;
uniform mat4 u_model;


varying vec3 v_worldPos;
varying vec4 v_projPos;
varying vec3 v_eyePos;


varying vec3 v_normal;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;
varying vec2 v_texCoord;
varying float v_dist;

/*
float CalculateWaveHeight(float amp, float freq, vec2 texCoord){
		highp int moduloHelper = int(u_time * freq);
		texCoord = texCoord * float(moduloHelper) * freq;
		vec4 heightSample = texture2D(u_heightSampler, texCoord);
		float waveHeight = heightSample.x;
		moduloHelper = int(waveHeight / amp);
		waveHeight -= float(moduloHelper) * amp;
		return waveHeight;
}*/

void main() {

	v_eyePos = (u_modelView * vec4(a_position,1.)).xyz;
  v_worldPos = (u_model * vec4(a_position,1.0)).xyz;

	v_normal = a_normal;
	v_texCoord = a_texCoord;

	gl_Position = v_projPos = u_projection * vec4(v_eyePos, 1.);
}
