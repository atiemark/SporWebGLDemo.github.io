/**
 * a simple shader
 */

 // position of vertex
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;

uniform mat4 u_modelView;
uniform mat4 u_projection;

varying vec2 v_texCoord;

void main() {

	vec4 eyePosition = u_modelView * vec4(a_position,1);
	v_texCoord = a_texCoord;
  // projection with projectionMatrix

	gl_Position = u_projection * eyePosition;

	//gl_Position = vec4(a_position, 1.0);

}
