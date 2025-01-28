precision mediump float;

attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;

uniform mat4 u_modelView;
uniform mat4 u_projection;
uniform float u_time;

varying vec3 v_pos;
varying vec3 v_normal;
varying vec3 v_viewingDir;
varying vec4 eyePosition;


void main() {
	float divi = 100.0;
	float scale = 100.0;
	float strength = 0.0;
	eyePosition = u_modelView * vec4(a_position.x + strength*sin(u_time+a_position.x*scale)/divi, a_position.y + strength*sin(u_time+a_position.y*scale)/divi, a_position.z + strength*sin(u_time+a_position.z*scale)/divi, 1.0);

  v_pos = a_position;
	v_normal = a_normal;
	v_viewingDir = eyePosition.xyz - v_pos;

	gl_Position = u_projection * eyePosition;
}
