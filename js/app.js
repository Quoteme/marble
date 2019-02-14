var entities = [];
var camera, scene, renderer, controls, ambientLight, spotLight;
var plane, marble, goal, start;

var f = { "f(z)": "exp(z/10-5i)", "compiled": math.compile("0+i")};
	// = (z)=>math.sin(math.add(math.divide(z,10),math.complex(0,-5)));
init();
animate();
function init() {
	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 1000 );
	scene = new THREE.Scene();

	//
	ambientLight = new THREE.AmbientLight( 0xffffff, 0.2 ); // soft white light
	scene.add( ambientLight );
	spotLight = new THREE.SpotLight( 0xffffff, 1, 300 );
	spotLight.position.set( 50, 150, -50 );
	spotLight.castShadow = true;
	spotLight.shadow.mapSize.width = 1024;
	spotLight.shadow.mapSize.height = 1024;
	scene.add(spotLight);

	var geometry = new THREE.PlaneGeometry( 200, 200, 200,200 );
	var material = new THREE.MeshPhongMaterial( {
		color: "#bbff00",
		side: THREE.DoubleSide
	} );
	plane = new THREE.Mesh( geometry, material );
	plane.rotation.x = Math.PI/2;
	//plane.position.z -= plane.geometry.parameters.height*2;
	plane.position.y -= 1;
	plane.scale.z = -1;
	plane.receiveShadow = true;
	scene.add( plane );

	goal = new Goal();
	scene.add( goal.mesh );

	var geometry = new THREE.SphereGeometry( 2, 32, 32 );
	var material = new THREE.MeshPhongMaterial( {color: "#FF4400", reflectivity:1, transparent:true, opacity: 0.75} );
	start = new THREE.Mesh( geometry, material );
	start.receiveShadow = true;
	start.castShadow = true;

	start.position.set(10,10,-10);
	scene.add(start);

	camera.position.y = 50;
	camera.position.z = 100;

	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	renderer.shadowMap.enabled = true;
	renderer.shadowMap.type = THREE.PCFSoftShadowMap;
	document.body.appendChild( renderer.domElement );

	controls = new THREE.OrbitControls( camera );
	controls.enableKeys = false;
	controls.target.x = plane.geometry.parameters.width/2;
	controls.target.z = -plane.geometry.parameters.height/2;
	//
	window.addEventListener( 'resize', onWindowResize, false );
}
function updatePlane(
	plane,
	f=(z)=>(math.exp(math.divide(z,10))),
	x=0,y=0,
	width=plane.geometry.parameters.widthSegments,
	height=plane.geometry.parameters.heightSegments
){
	let v = plane.geometry.vertices;
	let maxW = plane.geometry.parameters.widthSegments;
	let maxH = plane.geometry.parameters.heightSegments;

	if( width+x>maxW )
		width = maxW-x;
	if( height+y>maxH )
		height = maxH-y;

	for (var i=x; i<=height; i++) {
		for (var j=y; j<=width; j++) {
			v[
				i+j+
				j*height
			].z=f(math.complex(i-maxW/2,j-maxH/2)).re;
		}
	}
	plane.geometry.verticesNeedUpdate = true
}
function movePlane(plane, x,y, f){
	let v = plane.geometry.vertices;
	let width = plane.geometry.parameters.widthSegments;
	let height = plane.geometry.parameters.heightSegments;

	for (var i=0; i<=height-y; i++) {
		for (var j=0; j<=width-x; j++) {
			v[
				i+j+
				j*height
			].z= v[
					((y+i)+j)%width+x+
					(j+x)*width
				].z;
		}
	}
	plane.geometry.verticesNeedUpdate = true
}
function Goal ( x=Math.random()*200-100, y=Math.random()*200-100, z=Math.random()*200-100, radius=10, color="#00bbff" ){
	this.geometry = new THREE.SphereGeometry( radius, 32, 32 );
	this.material = new THREE.MeshPhongMaterial( {color: color, reflectivity:1, transparent:true, opacity: 0.75} );
	this.mesh = new THREE.Mesh( this.geometry, this.material );
	this.mesh.receiveShadow = true;
	this.mesh.castShadow = true;

	this.radius = radius;

	this.mesh.position.x = x;
	this.mesh.position.y = y;
	this.mesh.position.z = z;

	this.newPos = ()=>{
		this.mesh.position.set(
			Math.random()*200-100,
			Math.random()*200-100,
			Math.random()*200-100
		)
	}
	this.collision = (e)=>{
		return e.filter( (elem,i) => math.hypot(
				elem.mesh.position.x - this.mesh.position.x,
				elem.mesh.position.y - this.mesh.position.y,
				elem.mesh.position.z - this.mesh.position.z
				) < elem.radius+this.radius
		)
	}
	this.step = (e)=>{
		let coll = this.collision(e);
		if (coll.length>0) {
			this.newPos();
		}
		for (var i=coll.length; i>0; i--) {
			// e[e.indexOf(coll[i])].mesh.position.set(-1000,-1000,-1000);
		}
		return e;
	}
}
function Ball ( x=start.position.x, y=start.position.y, z=start.position.z, radius=Math.random()*2+1, color="#"+((1<<24)*Math.random()|0).toString(16) ) {
	this.geometry = new THREE.SphereGeometry( radius, 32, 32 );
	this.material = new THREE.MeshPhongMaterial( {color: color, reflectivity:1} );
	this.mesh = new THREE.Mesh( this.geometry, this.material );
	//
	this.mesh.receiveShadow = true;
	this.mesh.castShadow = true;
	//
	this.mesh.position.x = x;
	this.mesh.position.y = y;
	this.mesh.position.z = z;
	//
	this.moving = true;
	this.radius = radius;
	this.velocity = {
		'x': 0,
		'y': 0,
		'z': 0,
	}
	//
	this.resetVelocity = ()=>{
		this.velocity.x = 0;
		this.velocity.y = 0;
		this.velocity.z = 0;
	}
	this.resetPosition = ()=>{
		this.mesh.position.x = start.position.x;
		this.mesh.position.y = start.position.y;
		this.mesh.position.z = start.position.z;
	}
	this.collision = (f,accuracy=40)=>{
		if(math.abs(this.mesh.position.x)>100||math.abs(this.mesh.position.z)>100)
			return [];
		let points = [];
		for (var x=0; x<360; x+=accuracy) {
			for (var y=0; y<360; y+=accuracy) {
				points.push([
					this.radius*Math.sin(x*Math.PI/180)*Math.sin(y*Math.PI/180)+this.mesh.position.x,
					this.radius*Math.cos(x*Math.PI/180)+this.mesh.position.y,
					this.radius*Math.sin(x*Math.PI/180)*Math.cos(y*Math.PI/180)+this.mesh.position.z
				]);
			}
		}
		points = points.filter( p=>math.abs(this.mesh.position.y-f(math.complex(p[0],-p[2])).re)<=this.radius )
		return points
	}
	this.step = (funcs=[])=>{
		if(!this.moving)
			return;
		// gravity
		this.velocity.y += 0.1;
		funcs.map( f=>this.collision(f) ).forEach( (m,i)=>{
			if( m.length>0 ){
				m = m.sort( (a,b)=>a[1]-b[1] );
				// find the derivatives
				let derivRE = math.divide(math.subtract( funcs[i](math.complex(m[0][0]+1/2000,m[0][2])) , funcs[i](math.complex(m[0][0],m[0][2])) ).re,1/100);
				let derivIM = math.divide(math.subtract( funcs[i](math.complex(m[0][0],m[0][2]+1/2000)) , funcs[i](math.complex(m[0][0],m[0][2])) ).re,1/100);

				//
//				if( this.velocity.y<0){
//					let angleX = math.atan2(math.abs(derivRE),1/2000);
//					let angleZ = math.atan2(math.abs(derivIM),1/2000);
//					this.velocity.x += math.sin(angleX)*this.velocity.y;
//					this.velocity.z += math.sin(angleZ)*this.velocity.y;
//				}
				this.velocity.y = 0;
				//
//				if(this.velocity.x>0 && derivRE<0 ||
//					this.velocity.x<0 && derivRE>0){
//
//					this.velocity.y -= math.sin(math.atan2(math.abs(derivRE),1/2000))*math.abs(this.velocity.x);
//					this.velocity.x *= 0.9;
//				}
//				if(this.velocity.z>0 && derivIM<0 ||
//					this.velocity.z<0 && derivIM>0){
//
//					this.velocity.y -= math.sin(math.atan2(math.abs(derivIM),1/2000))*math.abs(this.velocity.z);
//					this.velocity.z *= 0.9;
//				}
//				console.log(`%c ${math.round(this.velocity.x*100)/100} --  ${derivRE}`, `color: ${(this.velocity.x>0&&derivRE>0)?"green":"red"}`);
//				console.log(`%c ${math.round(this.velocity.z*100)/100} --  ${derivIM}`, `color: ${(this.velocity.z>0&&derivIM>0)?"blue":"orange"}`);
				if(this.velocity.x>0 && derivRE>0 || this.velocity.x<0 && derivRE<0){
					this.velocity.y -= math.sin(math.atan2(math.abs(derivRE),1/2000))*math.abs(this.velocity.x);
					this.velocity.x *= 0.995;
				}
				if(this.velocity.z>0 && derivIM>0 || this.velocity.z<0 && derivIM<0){
					this.velocity.y -= math.sin(math.atan2(math.abs(derivIM),1/2000))*math.abs(this.velocity.z);
					this.velocity.z *= 0.995;
				}
				this.velocity.z += derivIM;
				this.velocity.x += derivRE;
			}
		});
//		let angleY = math.atan2(this.velocity.y, this.velocity.x);
//		if( funcs.filter( f=>math.abs(
//			this.position.y-f(math.complex(this.mesh.position.x+math.cos(angleY)*this.radius, this.mesh.position.z+math.sin(angleY)*this.radius).re) < this.radius )).length > 0 ){
//			console.log("collision!!!")
//		}
		this.mesh.position.x -= this.velocity.x;
		this.mesh.position.y -= this.velocity.y;
		this.mesh.position.z -= this.velocity.z;
	}
}
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}
function animate() {
	requestAnimationFrame( animate );
	entities.forEach( (e,i)=>{
		if( math.abs(e.mesh.position.x)>1000 ||
			math.abs(e.mesh.position.y)>1000 ||
			math.abs(e.mesh.position.z)>1000){
			// delete ball now
			entities.splice(i,1);
			gui.removeFolder( controllers[i] );
			controllers.splice(i,1);
		}else{
			e.step([
				(z)=>f.compiled.eval({"z":z})
			])
		}
	})
	entities = goal.step(entities);
	controls.update();
	renderer.render( scene, camera );
}
