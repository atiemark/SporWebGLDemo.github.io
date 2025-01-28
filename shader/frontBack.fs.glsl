
precision mediump float;

uniform float u_time;

varying vec3 v_pos;
varying vec3 v_normal;
varying vec3 v_viewingDir;

void main()
{

  /*
    vec3 fdx = dFdx(position);
    vec3 fdy = dFdy(position);
    vec3 faceNormal = normalize(cross(fdx,fdy));
    if (dot (v_normal, faceNormal) > 0.0) {
      gl_FragData[0] = vec4(0.5 * (v_pos + 1.0), 1.0);
      gl_FragData[1] = vec4(0, 0, 0, 1);
    }else{
      gl_FragData[0] = vec4(0, 0, 0, 1);
      gl_FragData[1] = vec4(0.5 * (v_pos + 1.0), 1.0);
    }
*/

//if(!gl_FrontFacing)
    gl_FragColor = vec4((0.5 * v_pos) + 1.0, 1.0);
/*

    if (dot(v_viewingDir, v_normal) <= 0.0 ) {
        gl_FragData[0] = vec4(v_pos, 1.0);
        //gl_FragData[1] = vec4(0, 0, 0, 1);
    } else {
        //gl_FragData[0] = vec4(0, 0, 0, 1);
        gl_FragData[1] = vec4(v_pos, 1.0);
    }*/

}
