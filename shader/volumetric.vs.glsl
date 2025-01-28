// Phong Vertex Shader

precision mediump float;

attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec2 a_texCoord;

uniform mat4 u_modelView;
uniform mat3 u_normalMatrix;
uniform mat4 u_projection;
uniform mat4 u_model;
uniform mat4 u_view;

uniform sampler2D u_back;
uniform sampler2D u_front;

uniform vec3 u_lightPos;
uniform float u_UVscale;

uniform float u_time;

//inverse view matrix to get from eye to world space
uniform mat3 u_invView3x3;

//output of this shader
varying vec3 v_normalVec;
varying vec3 v_normalVecWorld;
varying vec3 v_cameraRayVec;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;
varying vec2 v_texCoord;
varying vec3 v_spaceTexCoord;
varying vec3 v_pos;
varying vec4 v_eyePos;
varying vec3 v_normal;

varying mat4 v_modelView;


varying vec3 v_worldspaceCoords;

varying vec4 eyePosition;




void main() {

	//float divi = 100.0;
	//float scale = 100.0;
	//float strength = 0.0;
	//eyePosition = u_modelView * vec4(a_position.x + strength*sin(u_time+a_position.x*scale)/divi, a_position.y + strength*sin(u_time+a_position.y*scale)/divi, a_position.z + strength*sin(u_time+a_position.z*scale)/divi, 1.0);

	eyePosition = u_modelView * vec4(a_position.x , a_position.y , a_position.z, 1.0);

	v_cameraRayVec = mat3(u_invView3x3) * eyePosition.xyz;
	v_normalVecWorld = mat3(u_invView3x3) * u_normalMatrix * a_normal;

	v_normalVec = u_normalMatrix * a_normal;

  v_eyeVec = -eyePosition.xyz;
	v_lightVec = u_lightPos - eyePosition.xyz;

	v_texCoord = a_texCoord;

	v_eyePos = eyePosition;

	v_normal = a_normal;

	v_modelView = u_modelView;

	v_worldspaceCoords = (u_model * vec4(a_position,1)).rgb;
	v_pos = a_position;

	gl_Position = u_projection * eyePosition;
}
