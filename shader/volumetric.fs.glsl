/**
 * a phong shader implementation with texture support
 */
precision mediump float;
/**
 * definition of the light properties related to material properties
 */

struct Volumetric {
	//shaderspecific uniforms
	vec3 colormult;
	int num_octaves;
	float scale;
	float brightness;
	float nearBrightness;
	float stepsize;
	int maxsteps;
	float diffuse;
	float contrast;
	float seed;
	float timemult;
	vec3 var;
 };

varying vec3 v_normalVec;
varying vec3 v_eyeVec;
varying vec3 v_lightVec;
varying vec3 v_pos;
varying vec4 v_eyePos;
varying vec3 v_normal;
varying vec3 v_spaceTexCoord;
varying vec3 v_worldspaceCoords;

varying mat4 v_modelView;

//texture related variables
uniform int u_screenRexX;
uniform int u_screenRexY;
varying vec2 v_texCoord;
uniform sampler2D u_back;
uniform sampler2D u_front;

uniform float u_time;

//volumetric settings
uniform Volumetric u_vol;


//for env shading
varying vec3 v_normalVecWorld;
varying vec3 v_cameraRayVec;

uniform bool u_useReflection;
uniform bool u_useRefraction;
uniform bool u_useFresnel;
uniform float u_refractionEta;
uniform float u_fresnelR0;

uniform samplerCube u_texCube;


//uniform sampler3D u_noise;

/*
vec4 noiseFct(vec3 pos){
	return texture2D(u_noise, pos.xy);
}*/



float random (in vec3 _st) {
		return fract(sin(dot(_st, vec3(33.9898,7782.233, 125423.234234)))* 3758.5453123*float(u_vol.seed));
}

float noise3d (in vec3 _st) {
    vec3 i = floor(_st);
    vec3 frac = fract(_st);

    // 8 corners in 3D of a cube
		float k = 1.0;

    float a = random(i);
    float b = random(i + vec3(k, 0.0, 0.0));
    float c = random(i + vec3(0.0, k, 0.0));
    float d = random(i + vec3(k, k, 0.0));
		float e = random(i + vec3(0.0, 0.0,k));
    float f = random(i + vec3(k, 0.0, k));
    float g = random(i + vec3(0.0, k, k));
    float h = random(i + vec3(k, k, k));

    vec3 u = frac /* frac * (3.0 - 2.0 * frac)*/;

		return mix(mix(mix(a, b, u.x), mix(c, d, u.x), u.y) , mix(mix(e, f, u.x), mix(g, h, u.x), u.y), u.z);
}



float fbm ( in vec3 _st) {
		float f = u_vol.diffuse+0.5;
    float v = -0.65*f;
    float a = 1.1*f;

		//float v = 0.;
		//float a = 0.5;
		//vec3 offs = vec3(0., 0., u_time)/100.;

    for (int i = 0; i <50 ; ++i) {
			if(i == u_vol.num_octaves){
				break;
			}
        v += a * noise3d(_st /*+ offs*/);
				_st =  _st * 2.0 /*+ offs*/;
        a *= 0.5;
    }
    return v;
}

/*
mat4 rotationMatrix(vec3 axis, float angle)
{
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                0.0,                                0.0,                                0.0,                                1.0);
}


bool onLine(vec3 p1, vec3 p2, vec3 p3, float tolerance){

	//check if p3 lies ON line p1 - p2 by crossing p3 - p1 and p3 - p2
	vec3 d = p2-p1;
	vec3 pd1 = p2-p3;
	vec3 pd2 = p3-p1;
	float crossPr = length(cross(d, pd1));
	if(crossPr > tolerance){
		return false;
	}

	//check if point lies between p1 and p2
	if(length(pd1+pd2) + tolerance > length(d)+tolerance/2.){
		return false;
	}
	return true;
}*/

float fresnel(vec3 direction, vec3 normal) {
    vec3 nDirection = normalize( direction );
    vec3 nNormal = normalize( normal );

    float cosine = dot( nNormal, nDirection );
    float product = max( cosine, 0.0 );
    float factor = pow( 1.0-product, 5.0 );

    factor = u_fresnelR0 + (1.0-u_fresnelR0)*factor;

    return factor;
}



void main (void) {

	//ENV PART-----------------------------------------------------------------------------------------------------------------------
	vec3 normalVec = normalize(v_normalVecWorld);
	vec3 cameraRayVec = normalize(v_cameraRayVec);

	vec3 texCoords = cameraRayVec;
	vec4 envColor = textureCube(u_texCube, texCoords);

	vec4 reflectColor = vec4(0.0,0.0,0.0,1.0);
	vec4 refractColor = vec4(0.0,0.0,0.0,1.0);
	vec4 fresnelColor = vec4(0.0,0.0,0.0,1.0);
	if(u_useReflection)
	{
			//compute reflected camera ray (assign to texCoords)
			texCoords  = reflect(cameraRayVec, normalVec);
			reflectColor = textureCube(u_texCube, texCoords);
	}
	if(u_useRefraction)
	{
			//compute reflected camera ray (assign to texCoords)
			texCoords  = refract(cameraRayVec, normalVec, u_refractionEta);
			refractColor = textureCube(u_texCube, texCoords);
	}

	if(u_useFresnel)
	{
		 float fresnelTerm = fresnel(cameraRayVec, -normalVec);
		 fresnelColor = fresnelTerm*reflectColor + (1.0-fresnelTerm)*refractColor;
	}


	//VOLUME PART-----------------------------------------------------------------------------------------------------------------------
	vec2 lookup = (vec2(gl_FragCoord.x/float(u_screenRexX), gl_FragCoord.y/float(u_screenRexY)));
	//lookup = vec2(0.5, 0.5);

	vec4 back = texture2D(u_back, lookup);
	vec4 front = texture2D(u_front, lookup);
	front = vec4((0.5 * v_pos) + 1.0, 1.0);
	//vec3 front = vec3(texture2D(u_front, lookup)).rgb;
	//vec3 front = ((0.5 * v_pos) + 1.0);
	vec3 distVec = front.rgb -back.rgb;
	float mult = 3.0;
	float absDist = mult * sqrt(distVec.x*distVec.x + distVec.y*distVec.y + distVec.z*distVec.z)/2.0;

	//vec4 p = noiseFct(vec3(0, 0, 0));

	float pos = 0.0;
	vec4 finalColor = vec4(0.0, 0.0, 0.0, 0.0);
	float finalShadow = 0.0;
	float steps = absDist/u_vol.stepsize;
	float dynStepsize = absDist/float(u_vol.maxsteps);

	vec3 p = vec3(0.,0., 0.);



	for(int i=0; i<100; i++){
		if(i == u_vol.maxsteps){
			break;
		}

		pos = u_vol.stepsize*float(i+1);
		if(pos > absDist){
			break;
		}

		vec3 st = (front.rgb - distVec*pos)*u_vol.scale;

		vec3 q = vec3(0.);
		q.x = fbm( st + 0.40*u_time*u_vol.timemult);
		q.y = fbm( st + vec3(2.0) * 0.2 * u_time*u_vol.timemult);
		q.z = fbm( st + vec3(5.0));

		vec3 r = vec3(0.);
		r.x = fbm( st + 1.0*q + vec3(1.7,9.2,4.3)*0.02*u_time*u_vol.timemult);
		r.y = fbm( st + 1.0*q + vec3(8.3,2.8,5.2) * u_vol.var*0.5);
		r.z = fbm( st + 1.0*q + vec3(8.3,2.8,6.3) * u_vol.var);


		float f = fbm(st+r);

		vec3 color = vec3(1);


		color = mix(vec3(0.301961,0.819608,0.866667),
									vec3(0.666667,0.666667,0.498039),
									clamp((f*f)*.0,0.0,1.0));

		color = mix(color,
									vec3(0.3,0.3,0.464706),
									clamp(length(q),0.0,1.0));

		color = mix(color,
									vec3(0.566667,1,1),
									clamp(length(r.x),0.0,1.0));


		float fCincr = (clamp(f*f*f+.6*f*f+.3*f * 0.7 * 0.3/f, 0.0, 0.8)+0.8)*u_vol.contrast-0.8*u_vol.contrast;
		//float fCincr = f;
		//float add = (1.0/(float(i)+1.0))*0.2;
		//float add = 0.0002*float(i) + 0.006 * (80./(float(i)+1.)) +  0.00001;// smoothstep(10., float(maxsteps), float(i))*0.07 ; //log(float(i)*10.+20.0)*0.01;
		float distanceBrightnessScale = float(i)/(steps);
	//	float add = (distanceBrightnessScale*u_vol.nearBrightness*0.5 + u_vol.farBrightness*0.5/distanceBrightnessScale)*0.05;
		float add = u_vol.brightness*0.1*clamp(((u_vol.nearBrightness*10.+10.)/steps),1., 10.);//+dynStepsize*0.*u_vol.nearBrightness);
		//float add = mix(0.04, add1, absDist);

		//float shadowVec = normalize(v_eyeVec)

		//calc shadow

		//search for a world position p on the surface thats on the shadowvec by iterating over the texture

/*
		vec2 sp = vec2(0., 0.);

		for(int xs = 0; xs<2048; xs++){
			if(xs == u_screenRexX){
				break;
			}

			for(int ys = 0; ys<1024; ys++){
				if(ys == u_screenRexY){
					break;
				}

				if()

				sp = vec2(xs, 0.0);

				//choose whether to search for ray-surface intersection point on front or back texture
				//depending on hte shadow/light orientation
				if(dot(shadowVec.xyz, v_eyeVec)/(length(shadowVec)+length(v_eyeVec)) < 90.0){
					vec3 p = texture2D(u_back, sp).rgb;
				}else{
					vec3 p = texture2D(u_front, sp).rgb;
				}

				if(onLine(st, st + shadowVec.xyz * 1000000., p, 1.)){
					break;
				}

			}
		}*/


		//float yst = float(ys)/float(2048);

		//we have now found 2 points for a shadow raymarch through the volume


/*

		const int MAX_SHADOWSTEPS = 50;
		const float shadowDist = .5;
		const float shadowVecstepsize = .1;

		float shadowLength = length(st + shadowVec.xyz * shadowDist);
		float f_shadow = 0.0;

		for(int s=0; s<MAX_SHADOWSTEPS; s++){
			float shPos = shadowVecstepsize*float(s+1);
			if(shPos > shadowLength){
				break;
			}

			vec3 st_shadow = (st + shadowVec.xyz* shPos)*u_SCALE;


			vec3 q = vec3(0.);
			q.x = fbm( st + 0.40*u_time);
			q.y = fbm( st + vec3(2.0) * 0.2 * u_time);
			q.z = fbm( st + vec3(5.0));

			vec3 r = vec3(0.);
			r.x = fbm( st + 1.0*q + vec3(1.7,9.2,4.3));
			r.y = fbm( st + 1.0*q + vec3(8.3,2.8,5.2));
			r.z = fbm( st + 1.0*q + vec3(8.3,2.8,6.3));


			float f_shadow = fbm(st_shadow + r);

			finalShadow += f_shadow * 0.001;

		}*/

		finalColor += vec4(vec3(fCincr, fCincr, fCincr)*color*u_vol.colormult*add*((.4/fCincr)+0.6)/1.6 , 0.6/steps);

	}

	//if(true){
	//	vec2 a = vec2(1.,1.);
	//}
	float envcontrast = 1.;
	vec4 fresnelAdd = mix(vec4(0,0,0,0), envcontrast*fresnelColor+(1.-envcontrast), 1.-finalColor.a +0.2);

	gl_FragColor = vec4(
		clamp(finalColor.x, 0.01,1.),
		clamp(finalColor.y,(0.1/absDist)*0.05-4.00, 1.),
		clamp(finalColor.z, (0.1/absDist)*0.05-2.0,1.) ,
		finalColor.a-0.2 )
		 +
		vec4(
			clamp(fresnelAdd.r, 0.0, 1.0),
			clamp(fresnelAdd.g, 0.0, 1.0),
			clamp(fresnelAdd.b, 0.0, 1.0),
			clamp(fresnelAdd.a, 0.0, 1.0)
			); //+ shadowVec;//clamp(finalColor.a, (0.05/absDist)*0.1-0.4, 1.));



	//gl_FragColor = vec4(gl_FragCoord.r / 1000.0, gl_FragCoord.g / 1000.0, 0.0, 1.0);
}
