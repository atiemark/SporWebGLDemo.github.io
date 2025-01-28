/**
 * a phong shader implementation with texture support
 */
precision mediump float;

/**
 * definition of a material structure containing common properties
 */
struct Material {
	vec4 ambient;
	vec4 diffuse;
	vec4 specular;
	vec4 emission;
	float shininess;
};

/**
 * definition of the light properties related to material properties
 */
struct Light {
	vec4 ambient;
	vec4 diffuse;
	vec4 specular;
};

//illumination related variables
uniform Material u_material;
uniform Light u_light;
uniform float u_time;
varying vec3 v_normalVec;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;

//texture related variables
varying vec2 v_texCoord;
varying vec3 v_spaceTexCoord;

uniform sampler2D u_diffuseTex;
uniform bool u_diffuseTexEnabled;

uniform vec3 u_modelMin;
uniform vec3 u_modelMax;


vec4 gradient(float f)
{
    vec4 c = vec4(0);
    f = mod(f, 1.5);
    for (int i = 0; i < 3; ++i)
        c[i] = pow(.5 + .5 * sin(2.0 * (f +  .2*float(i))), 10.0);
    return c;
}

float offset(float th)
{
    return .5*sin(25.*th)*sin(u_time);
}

vec4 tunnel(float th, float radius)
{
	return gradient(offset(th + .5*u_time) + .4*log(3.*radius) - u_time);
}



vec4 calculateSimplePointLight( Light light, Material material,
	vec3 lightVec, vec3 normalVec, vec3 eyeVec,
	bool useTexColor, vec4 texColor ) {
	lightVec = normalize(lightVec);
	normalVec = normalize(normalVec);
	eyeVec = normalize(eyeVec);

	if (useTexColor) {
		material.diffuse = texColor;
	}

	//compute diffuse term
	float diffuse = max(dot(normalVec,lightVec),0.0);

	//compute specular term
	vec3 reflectVec = reflect(-lightVec,normalVec);
	float spec = pow( max( dot(reflectVec, eyeVec), 0.0) , material.shininess);

	vec4 c_amb  = clamp(light.ambient * material.ambient, 0.0, 1.0);
	vec4 c_diff = clamp(diffuse * light.diffuse * material.diffuse, 0.0, 1.0);
	vec4 c_spec = clamp(spec * light.specular * material.specular, 0.0, 1.0);
	vec4 c_em   = material.diffuse/5.0;

  return c_amb + c_diff + c_spec + c_em;
}

void main (void) {

	//diffuseTexColor = texture2D(u_diffuseTex, v_texCoord);

/*
  gl_FragColor = calculateSimplePointLight(u_light, u_material, v_lightVec, v_normalVec,
			v_eyeVec, true, diffuseTexColor );
*/
	vec4 texCoords = vec4(v_texCoord[0], v_texCoord[1], 0.5, 1.0);
	//texCoords = vec4(v_spaceTexCoord.x, v_spaceTexCoord.y, v_spaceTexCoord.z, 1.0);

	vec4 diffuseTexColor = tunnel(atan(texCoords[0], texCoords[1]), atan(v_texCoord[0], v_texCoord[1]));
	diffuseTexColor[3] = 1.0;
	gl_FragColor = diffuseTexColor;


}
