/**
 * Created by Daniel Keppinger on 07.01.2018.
 */
precision mediump float;

uniform sampler2D u_reflectionSampler;

varying vec2 v_texCoord;

void main() {

	gl_FragColor = vec4(1.0, 1.0, 0.0, 1.0);
	//gl_FragColor = texture2D(u_reflectionSampler, v_texCoord);
}
